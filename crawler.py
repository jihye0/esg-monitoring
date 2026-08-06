# -*- coding: utf-8 -*-
"""ESG 규제 모니터링 크롤러

구글 시트 'ESG 규제 크롤링 사이트' 목록의 7개 소스에서 최신 기사를 수집하고
대시보드 데이터(assets/data.js)를 생성한다.

- 페이지(index.html / weekly.html / reg.html)는 정적 파일이며 다시 만들지 않는다.
  크롤러는 assets/data.js 만 갱신하면 페이지가 최신 데이터를 읽는다.
- seen.json 에 과거에 본 기사 링크를 기록해 두고, 이번 수집에서 처음 본
  기사에 new=True 를 표시한다. 페이지는 이 표시로 빨간 신규 배지를 띄운다.

사용법:
    python crawler.py            # 수집 + data.json + assets/data.js 갱신
"""
import html
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import feedparser
import requests

BASE = Path(__file__).parent
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

def gnews(query):
    return (
        "https://news.google.com/rss/search?q="
        + requests.utils.quote(query)
        + "&hl=en-US&gl=US&ceid=US:en"
    )

# 소스 정의: 직접 RSS가 되는 곳은 직접, 봇 차단(403)인 곳은 Google News RSS로 우회
SOURCES = [
    {
        "id": "eurlex",
        "name": "EUR-Lex (EU 관보)",
        "home": "https://eur-lex.europa.eu",
        "desc": "CSDDD·EUDR·배터리규정 원문, 개정 이력, 관보 게재",
        "feeds": [gnews("site:eur-lex.europa.eu")],
    },
    {
        "id": "ec",
        "name": "EU 집행위원회",
        "home": "https://ec.europa.eu/commission/presscorner",
        "desc": "신규 규제 발의, Omnibus 등 간소화 패키지, 가이드라인",
        "feeds": ["https://ec.europa.eu/commission/presscorner/api/rss?search=&language=en"],
    },
    {
        "id": "europarl",
        "name": "유럽의회",
        "home": "https://www.europarl.europa.eu/news/en",
        "desc": "규제 심의·표결 진행 상황",
        "feeds": [
            "https://www.europarl.europa.eu/rss/doc/press-releases/en.xml",
            gnews("site:europarl.europa.eu"),
        ],
    },
    {
        "id": "consilium",
        "name": "EU 이사회",
        "home": "https://www.consilium.europa.eu/en/press",
        "desc": "최종 의결·채택 동향",
        "feeds": [gnews("site:consilium.europa.eu")],
    },
    {
        "id": "esgtoday",
        "name": "ESG Today",
        "home": "https://www.esgtoday.com",
        "desc": "규제·정책 뉴스, 기관투자자 관점",
        "feeds": ["https://www.esgtoday.com/feed/"],
    },
    {
        "id": "esgdive",
        "name": "ESG Dive",
        "home": "https://www.esgdive.com",
        "desc": "지속가능성·거버넌스 심층 기사",
        "feeds": ["https://www.esgdive.com/feeds/news/"],
    },
    {
        "id": "reuters",
        "name": "Reuters Sustainability",
        "home": "https://www.reuters.com/sustainability/",
        "desc": "강제노동·산림전용 속보",
        "feeds": [gnews("site:reuters.com/sustainability")],
    },
]

# 규제별 전용 뉴스 검색 (Google News) — 규제별 정리 뷰의 기사 공급원
# 키는 TAGS의 태그명과 일치해야 함
REG_NEWS = {
    "CSDDD 공급망실사": '"CSDDD" OR "Corporate Sustainability Due Diligence Directive"',
    "CSRD·ESRS 보고": '"CSRD" OR "ESRS" sustainability reporting EU',
    "EUDR 산림전용": '"EUDR" OR "EU deforestation regulation"',
    "CBAM 탄소국경": '"CBAM" OR "carbon border adjustment mechanism"',
    "배터리 규정": '"EU battery regulation" OR "battery passport"',
    "강제노동": '"EU forced labour regulation" OR "forced labor ban" EU products',
    "Omnibus 간소화": 'EU omnibus sustainability simplification CSRD CSDDD',
    "택소노미": '"EU taxonomy" sustainable finance',
    "SFDR 공시": '"SFDR" sustainable finance disclosure',
    "그린워싱·표시": '"green claims directive" OR "greenwashing" EU regulation',
}

# ESG 관련성 필터: 일반 소스(EU 기관 등)는 아래 키워드에 걸리는 기사만 수집
# ESG 전문 매체(esgtoday, esgdive)와 Reuters 지속가능성 섹션은 필터 없이 전부 수집
FILTERED_SOURCES = {"eurlex", "ec", "europarl", "consilium"}
RELEVANT = re.compile(
    r"sustainab|esg|climate|carbon|emission|deforest|environment|due diligence"
    r"|csrd|csddd|cbam|eudr|esrs|taxonomy|batter(y|ies)|circular|recycl|waste"
    r"|packaging|ecodesign|greenwash|green claim|green deal|forced labo|human rights"
    r"|renewable|pollut|biodivers|net.?zero|energy|emissions trading|\bets\b|sfdr"
    r"|supply chain|non.?financial|corporate governance",
    re.IGNORECASE,
)

# 규제 키워드 태그 (제목+요약에서 매칭)
TAGS = {
    "CSDDD 공급망실사": r"csddd|due diligence|supply chain directive|공급망 실사",
    "CSRD·ESRS 보고": r"csrd|esrs|sustainability report|non-financial report",
    "EUDR 산림전용": r"eudr|deforestation",
    "CBAM 탄소국경": r"cbam|carbon border",
    "배터리 규정": r"battery regulation|battery passport|batteries regulation",
    "Omnibus 간소화": r"omnibus|simplification package",
    "강제노동": r"forced labo[u]?r|uyghur|uflpa",
    "택소노미": r"taxonomy",
    "SFDR 공시": r"sfdr|sustainable finance disclosure",
    "그린워싱·표시": r"green claims|greenwash",
    "탄소·기후": r"carbon|climate|emission|net.?zero|ets\b",
    "순환경제·폐기물": r"circular economy|recycl|packaging|waste|ecodesign|espr",
}

TRANS_CACHE_FILE = BASE / "trans_cache.json"
SEEN_FILE = BASE / "seen.json"  # 과거에 본 기사 링크 -> 처음 본 날짜

# ── '면밀 확인 필요' 신호 탐지 ──
# 규제의 상태 변화(채택·연기·시행·지침·제재)를 뜻하는 키워드가 제목/요약에 있으면
# alert 필드에 사유 라벨을 넣는다. 페이지는 이 표시로 빨간 '확인' 배지를 띄운다.
ALERTS = [
    ("채택·의결", r"adopt(?:ed|s|ion)|approv(?:es|ed|al)|\bvote[ds]?\b|provisional agreement"
                 r"|deal reached|official journal|trilogue"),
    ("일정·범위 변경", r"delay|postpon|push(?:e[sd])? back|stop.?the.?clock|simplif|omnibus"
                     r"|amend|revis(?:e|ed|ion)|exempt|threshold|scope"),
    ("시행·기한", r"enter(?:s|ed)? into force|come(?:s)? into (?:force|effect)|takes? effect"
                 r"|apply(?:ing)? from|application date|deadline|compliance date"),
    ("지침·기준 공표", r"guidance|guidelines|\bfaq\b|implementing act|delegated act"
                     r"|technical standard|methodology|template"),
    ("집행·제재", r"penalt|\bfine[sd]?\b|enforc|\bban(?:ned|s)?\b|prohibit|investigat"
                 r"|withdraw|recall"),
]
ALERTS = [(label, re.compile(pat, re.IGNORECASE)) for label, pat in ALERTS]

def compute_alert(it, now_utc):
    """최근 기사(신규 또는 21일 이내) + 규제 태그가 있을 때만 상태 변화 신호를 탐지."""
    if not (it.get("tags") or it.get("tag")):
        return None
    recent = bool(it.get("new"))
    if not recent and it.get("date"):
        try:
            dt = datetime.fromisoformat(it["date"].replace("Z", "+00:00"))
            recent = (now_utc - dt).days <= 21
        except ValueError:
            pass
    if not recent:
        return None
    text = it.get("title", "") + " " + it.get("summary", "")
    for label, pat in ALERTS:
        if pat.search(text):
            return label
    return None

def translate_ko(text, cache):
    """구글 번역 무료 엔드포인트로 한국어 번역. 캐시에 있으면 재사용."""
    if not text:
        return ""
    if text in cache:
        return cache[text]
    try:
        r = requests.get(
            "https://translate.googleapis.com/translate_a/single",
            params={"client": "gtx", "sl": "auto", "tl": "ko", "dt": "t", "q": text},
            headers=HEADERS, timeout=15,
        )
        segments = r.json()[0] or []
        out = "".join(s[0] for s in segments if s and s[0]).strip()
        if out:
            cache[text] = out
        return out
    except Exception:
        return ""

def clean(text, limit=300):
    if not text:
        return ""
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:limit] + ("…" if len(text) > limit else "")

def tag_item(text):
    found = []
    low = text.lower()
    for tag, pat in TAGS.items():
        if re.search(pat, low):
            found.append(tag)
    return found

def fetch_source(src):
    items = []
    for feed_url in src["feeds"]:
        try:
            r = requests.get(feed_url, headers=HEADERS, timeout=30)
            if r.status_code != 200 or not r.content.strip():
                print(f"  ! {src['id']}: {feed_url[:60]} -> HTTP {r.status_code}, 건너뜀")
                continue
            parsed = feedparser.parse(r.content)
            if not parsed.entries:
                print(f"  ! {src['id']}: 항목 없음, 다음 피드 시도")
                continue
            for e in parsed.entries:
                title = clean(getattr(e, "title", ""), 200)
                link = getattr(e, "link", "")
                if not title or not link:
                    continue
                summary = clean(getattr(e, "summary", ""), 280)
                # Google News는 제목 끝에 " - 매체명"을 붙이므로 제거
                title = re.sub(r"\s+-\s+[A-Za-z .&()']+$", "", title)
                if src["id"] in FILTERED_SOURCES and not RELEVANT.search(title + " " + summary):
                    continue
                ts = None
                for key in ("published_parsed", "updated_parsed"):
                    t = getattr(e, key, None)
                    if t:
                        ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", t)
                        break
                items.append({
                    "source": src["id"],
                    "title": title,
                    "link": link,
                    "date": ts or "",
                    # Google News 요약은 '제목 + 매체명' 반복이므로 그런 경우 버림
                    "summary": "" if summary.startswith(title[:40]) else summary,
                    "tags": tag_item(title + " " + summary),
                })
            print(f"  + {src['name']}: {len(parsed.entries)}건 수집")
            break  # 첫 번째로 성공한 피드만 사용
        except Exception as ex:
            print(f"  ! {src['id']} 오류: {ex}")
    return items

def fetch_regnews():
    """규제별 키워드 검색 뉴스 수집 (규제별 정리 뷰 전용)."""
    out, seen = [], set()
    for tag, q in REG_NEWS.items():
        try:
            r = requests.get(gnews(q), headers=HEADERS, timeout=30)
            parsed = feedparser.parse(r.content)
            cnt = 0
            for e in parsed.entries:
                raw = clean(getattr(e, "title", ""), 200)
                link = getattr(e, "link", "")
                if not raw or not link or link in seen:
                    continue
                m = re.search(r"\s+-\s+([^\-]{2,40})$", raw)
                media = m.group(1).strip() if m else ""
                title = raw[: m.start()] if m else raw
                ts = None
                for key in ("published_parsed", "updated_parsed"):
                    t = getattr(e, key, None)
                    if t:
                        ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", t)
                        break
                seen.add(link)
                out.append({
                    "tag": tag, "title": title, "link": link,
                    "date": ts or "", "media": media,
                })
                cnt += 1
                if cnt >= 12:
                    break
            print(f"  + 규제검색 [{tag}]: {cnt}건")
        except Exception as ex:
            print(f"  ! 규제검색 [{tag}] 오류: {ex}")
    out.sort(key=lambda x: x["date"], reverse=True)
    return out

def main():
    all_items = []
    print("수집 시작…")
    for src in SOURCES:
        all_items.extend(fetch_source(src))

    # 링크 기준 중복 제거, 날짜 내림차순
    seen, deduped = set(), []
    for it in all_items:
        key = it["link"]
        if key in seen:
            continue
        seen.add(key)
        deduped.append(it)
    deduped.sort(key=lambda x: x["date"], reverse=True)

    print("규제별 키워드 뉴스 수집…")
    regnews = fetch_regnews()

    # ── 신규 기사 판별: seen.json에 없던 링크면 new=True ──
    first_run = not SEEN_FILE.exists()
    seen_links = {}
    if not first_run:
        seen_links = json.loads(SEEN_FILE.read_text(encoding="utf-8"))
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    new_count = 0
    for it in deduped + regnews:
        # 첫 실행에서는 기준선만 만들고 전부 '기존'으로 취급
        it["new"] = (not first_run) and (it["link"] not in seen_links)
        if it["new"]:
            new_count += 1
        seen_links.setdefault(it["link"], today)
    SEEN_FILE.write_text(json.dumps(seen_links, ensure_ascii=False), encoding="utf-8")
    print(f"신규 기사 {new_count}건 감지" + (" (첫 실행: 기준선 생성)" if first_run else ""))

    # ── 면밀 확인 필요 신호 ──
    now_utc = datetime.now(timezone.utc)
    alert_count = 0
    for it in deduped + regnews:
        it["alert"] = compute_alert(it, now_utc)
        if it["alert"]:
            alert_count += 1
    print(f"확인 필요 신호 {alert_count}건 표시")

    # 한국어 요약(번역) — 캐시 덕분에 새 기사만 번역됨
    cache = {}
    if TRANS_CACHE_FILE.exists():
        cache = json.loads(TRANS_CACHE_FILE.read_text(encoding="utf-8"))
    print(f"한국어 번역 중… ({len(deduped) + len(regnews)}건)")
    for it in deduped:
        it["title_ko"] = translate_ko(it["title"], cache)
        it["summary_ko"] = translate_ko(it["summary"], cache)
    for it in regnews:
        it["title_ko"] = translate_ko(it["title"], cache)
    TRANS_CACHE_FILE.write_text(
        json.dumps(cache, ensure_ascii=False), encoding="utf-8"
    )

    # 재단 브리핑·권고 (comments.json — 주차별 코멘트 목록, 최신순)
    comments = []
    cfile = BASE / "comments.json"
    if cfile.exists():
        comments = json.loads(cfile.read_text(encoding="utf-8"))

    data = {
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "comments": comments,
        "regnews": regnews,
        "sources": [
            {k: s[k] for k in ("id", "name", "home", "desc")} for s in SOURCES
        ],
        "items": deduped,
    }
    (BASE / "data.json").write_text(
        json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8"
    )
    (BASE / "assets" / "data.js").write_text(
        "window.ESG_DATA = " + json.dumps(data, ensure_ascii=False) + ";",
        encoding="utf-8",
    )
    print(f"완료: 총 {len(deduped)}건 (신규 {new_count}건) -> assets/data.js, data.json")

def reprocess():
    """재수집 없이 기존 data.json에 확인 필요 신호만 다시 계산해 반영한다."""
    data = json.loads((BASE / "data.json").read_text(encoding="utf-8"))
    now_utc = datetime.now(timezone.utc)
    n = 0
    for it in data.get("items", []) + (data.get("regnews") or []):
        it["alert"] = compute_alert(it, now_utc)
        if it["alert"]:
            n += 1
    (BASE / "data.json").write_text(
        json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8"
    )
    (BASE / "assets" / "data.js").write_text(
        "window.ESG_DATA = " + json.dumps(data, ensure_ascii=False) + ";",
        encoding="utf-8",
    )
    print(f"재처리 완료: 확인 필요 신호 {n}건 -> assets/data.js, data.json")

if __name__ == "__main__":
    sys.exit(reprocess() if "--reprocess" in sys.argv else main())
