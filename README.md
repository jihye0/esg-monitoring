# EU ESG 규제 모니터링

자동차부품사를 위한 EU ESG 규제 동향 모니터링 사이트입니다.
공급망 실사·탄소국경·산림전용 등 부품업계에 직결되는 EU 규제 14종의 시행 일정과
주간 동향을 자동으로 수집해 한국어로 정리합니다.

**운영 중인 사이트 → <https://esg-monitoring.kmbridge.org>**

운영: K-Mobility 브릿지 재단(자동차부품산업진흥재단)

---

## 무엇을 볼 수 있나

| 페이지 | 내용 |
|---|---|
| [규제 현황](https://esg-monitoring.kmbridge.org/) | 규제 14종의 상태·시행일·관련 동향. 회사 규모와 EU 거래 형태를 고르면 직접 적용인지 고객사를 통한 간접 영향인지 재정렬됩니다 |
| [시행 캘린더](https://esg-monitoring.kmbridge.org/calendar.html) | 연도별 전체 시행 일정 |
| [확인 필요](https://esg-monitoring.kmbridge.org/alerts.html) | 규제 상태가 움직인 기사만 모아 보기 |
| [주간 동향](https://esg-monitoring.kmbridge.org/weekly.html) | 주차별 동향과 재단의 이슈 브리핑 |
| [시스템 소개](https://esg-monitoring.kmbridge.org/about.html) | 수집 방식과 데이터 출처 |

## 감시 중인 규제

| 약칭 | 규제 |
|---|---|
| CSDDD | 기업 지속가능성 실사 지침 |
| CSRD | 기업 지속가능성 보고 지침 (ESRS) |
| EUDR | 산림전용 규정 |
| CBAM | 탄소국경조정제도 |
| 배터리 | EU 배터리 규정 |
| PPWR | 포장재·포장폐기물 규정 |
| ESPR | 지속가능제품 에코디자인 규정 |
| ELVR | 차량 순환성·폐차 규정안 (ELV) |
| FLR | 강제노동 결부 상품 금지 규정 |
| Omnibus | 지속가능성 간소화 패키지 |
| 그린클레임 | 그린워싱 규제 (ECGT · 그린클레임 지침안) |
| 택소노미 | EU 녹색분류체계 |
| SFDR | 지속가능금융 공시 규정 |
| RED III | 재생에너지 지침 |

## 어떻게 동작하나

매주 월요일 09:00에 `crawler.py`가 자동 실행됩니다.

1. **수집** — EUR-Lex(EU 관보), EU 집행위원회, 유럽의회, EU 이사회, ESG Today,
   ESG Dive, Reuters Sustainability 7개 소스의 RSS와, 규제별 키워드 뉴스 검색 14건
2. **신규 판별** — `seen.json`에 이미 본 기사 링크를 기록해 두고, 처음 보는 기사에 신규 표시
3. **변화 신호 탐지** — 제목·요약에서 규제 상태가 움직였음을 뜻하는 표현을 찾아 사유를 붙입니다
   (`채택·의결` / `일정·범위 변경` / `시행·기한` / `지침·기준 공표` / `집행·제재`)
4. **한국어 번역** — 제목과 요약을 번역하고 `trans_cache.json`에 캐시해 재번역을 피합니다
5. **반영** — `assets/data.js`를 다시 쓰고 GitHub에 push하면 사이트가 갱신됩니다

수집되는 것은 RSS가 제공하는 **제목·요약·링크**이며, 기사 본문은 저장하지 않습니다.

HTML 페이지는 정적 파일이라 크롤러가 다시 만들지 않습니다. 데이터만 갈아끼웁니다.

## 저장소 구조

```
index.html  calendar.html  alerts.html      화면 (빌드 도구 없이 그대로 서빙)
weekly.html  reg.html  about.html
assets/
  common.js        규제 정의 14종, 공통 렌더링·판별 로직
  style.css        전체 스타일
  data.js          크롤러가 생성 — 페이지가 읽는 데이터
crawler.py         수집 → 신호 탐지 → 번역 → data.js 생성
run_weekly.ps1     주간 자동 실행 스크립트 (Windows 작업 스케줄러가 호출)
comments.json      재단 이슈 브리핑 (주차별)
data.json          data.js와 같은 내용의 읽기 쉬운 사본
seen.json          이미 본 기사 링크
trans_cache.json   번역 캐시
CNAME              사용자 지정 도메인
```

## 직접 돌려보기

```bash
pip install feedparser requests
python crawler.py                 # 수집 후 data.json / assets/data.js 갱신
python -m http.server 8000        # http://localhost:8000 에서 확인
```

자동 실행은 `run_weekly.ps1`이 담당합니다. Windows 작업 스케줄러에 등록해 두면
수집부터 `git push`까지 한 번에 처리합니다. 스크립트 안의 Python 경로는
실행 환경에 맞게 맞춰 주세요.

## 만들면서 정한 것

- **빌드 도구를 쓰지 않습니다.** Node나 번들러 없이 HTML·CSS·JS 파일을 그대로 올립니다.
  누구든 파일을 열어 고칠 수 있게 하기 위해서입니다.
- **서술은 확인된 것만.** 규제 해설과 이슈 브리핑은 수집된 기사나 규제 조문 구조에서
  따라오는 내용만 씁니다. 업계 일반론으로 메우지 않습니다.
- **브리핑에는 근거를 답니다.** 이슈 브리핑의 각 항목은 제목을 누르면 근거가 된
  원문 기사로 이동합니다.

## 참고

본 사이트는 공개된 EU 공식 채널과 전문 매체의 기사를 자동 수집해 정리한 참고 자료입니다.
규제 적용 여부와 대응 방법에 대한 법률 자문이 아니며, 실제 대응은 원문과 전문가 확인을
거쳐 판단하시기 바랍니다.

문의: esg@kmbridge.org
