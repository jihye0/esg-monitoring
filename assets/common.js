/* 공통 데이터·로직 — index.html / weekly.html / reg.html 에서 공유 */
window.ESG = (function () {
  const data = window.ESG_DATA || { generated: "", brief: null, regnews: [], sources: [], items: [] };
  const now = new Date();
  const DAY = 864e5;
  const EU = new Set(["eurlex", "ec", "europarl", "consilium"]);
  const srcById = {};
  (data.sources || []).forEach(s => srcById[s.id] = s);

  /* ── 규제 정의 ── */
  const REGS = [
    { id:"csddd", abbr:"CSDDD", name:"기업 지속가능성 실사 지침", status:"2028.7 적용 예정", cls:"soon",
      key:"2028-07-26", keyLabel:"대기업 적용",
      desc:"자사·자회사·공급망 전반의 인권·환경 부정영향 실사 의무. Omnibus로 적용 연기 및 의무 범위 간소화가 협상 중이라 최종 요건은 변동 가능.",
      timeline:"2024.7 발효 → 2028.7 대기업 적용",
      link:"https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024L1760",
      linkLabel:"지침 (EU) 2024/1760", tag:"CSDDD 공급망실사" },
    { id:"csrd", abbr:"CSRD", name:"기업 지속가능성 보고 지침 (ESRS)", status:"시행 중", cls:"live", key:null,
      desc:"ESRS 기준에 따른 지속가능성 공시 의무. 1차 대상(대형 상장사)은 보고 중이며, Omnibus 'stop-the-clock'으로 2·3차 대상은 2년 연기.",
      timeline:"2024 회계연도 1차 보고 개시 → 2·3차 대상 2년 연기",
      link:"https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2464",
      linkLabel:"지침 (EU) 2022/2464", tag:"CSRD·ESRS 보고" },
    { id:"eudr", abbr:"EUDR", name:"산림전용 규정", status:"2026.12.30 적용", cls:"soon",
      key:"2026-12-30", keyLabel:"대기업 적용",
      desc:"소·코코아·커피·팜유·고무·목재·대두 및 파생제품(타이어·가죽 등)의 산림전용 무관 실사·신고 의무. 시행 1년 연기로 대·중견기업은 2026년 말부터.",
      timeline:"2023.6 발효 → 2026.12.30 대기업 → 2027.6.30 중소기업",
      link:"https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1115",
      linkLabel:"규정 (EU) 2023/1115", tag:"EUDR 산림전용" },
    { id:"cbam", abbr:"CBAM", name:"탄소국경조정제도", status:"시행 중 (2026.1~)", cls:"live", key:null,
      desc:"철강·알루미늄·시멘트·비료·수소·전력 수입품의 내재 탄소배출량에 비용 부과. 철강·알루미늄 부품 수출기업에 직접 영향.",
      timeline:"2023.10 전환기간 → 2026.1 본격 시행 → 2027.2 인증서 판매",
      link:"https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R0956",
      linkLabel:"규정 (EU) 2023/956", tag:"CBAM 탄소국경" },
    { id:"battery", abbr:"배터리", name:"EU 배터리 규정", status:"단계적 시행 중", cls:"soon",
      key:"2027-02-18", keyLabel:"배터리 여권",
      desc:"배터리 전 생애주기 규제: 탄소발자국 신고, 재활용 원료 최소 비율, 공급망 실사, 배터리 여권. 전기차 배터리·부품 공급망에 직접 적용.",
      timeline:"2023.8 발효 → 단계적 확대 → 2027.2 배터리 여권 의무화",
      link:"https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1542",
      linkLabel:"규정 (EU) 2023/1542", tag:"배터리 규정" },
    { id:"ppwr", abbr:"PPWR", name:"포장재·포장폐기물 규정", status:"시행 중 (2026.8~)", cls:"live", key:null,
      desc:"EU 시장에 출시되는 모든 포장(운송·산업 포장 포함)에 재활용 설계, 재생원료 비율, 최소화, 표시 의무 부과. 수출 포장과 완성차 납품 포장 사양에 영향.",
      timeline:"2025.2 발효 → 2026.8.12 적용 개시 → 2030 재활용 설계·재생원료 기준",
      link:"https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32025R0040",
      linkLabel:"규정 (EU) 2025/40", tag:"PPWR 포장재" },
    { id:"espr", abbr:"ESPR", name:"지속가능제품 에코디자인 규정", status:"시행 중 · 품목별 단계 적용", cls:"live", key:null,
      desc:"제품의 내구성·재활용성·재생원료 등 에코디자인 요건과 디지털 제품 여권(DPP)을 품목별 위임법으로 도입. 1차 작업계획에 철강·알루미늄·타이어가 포함되어 소재·부품 데이터 요구로 이어질 전망.",
      timeline:"2024.7 발효 → 2025.4 1차 작업계획 → 품목별 위임법 단계 적용",
      link:"https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1781",
      linkLabel:"규정 (EU) 2024/1781", tag:"ESPR 에코디자인" },
    { id:"elvr", abbr:"ELVR", name:"차량 순환성·폐차 규정안 (ELV)", status:"입법 협상 중", cls:"wip", key:null,
      desc:"차량 설계 단계부터 재활용성, 재생 플라스틱 비율(25% 목표), 부품 탈거·재사용 용이성을 요구하는 규정안. 완성차 형식승인과 연계되어 부품 사양에 직접 파급되는 자동차 전용 규제.",
      timeline:"2023.7 규정안 제안 → 의회·이사회 심의 → 협상 진행 중",
      link:"https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52023PC0451",
      linkLabel:"규정안 COM(2023) 451", tag:"ELV 폐차·순환" },
    { id:"flr", abbr:"FLR", name:"강제노동 결부 상품 금지 규정", status:"2027.12 적용", cls:"soon",
      key:"2027-12-14", keyLabel:"적용 개시",
      desc:"강제노동으로 생산된 모든 제품의 EU 시장 출시·판매·수출 금지. 품목 제한 없이 적용되며 입증 시 회수·폐기 명령 가능.",
      timeline:"2024.12 발효 → 2027.12.14 적용 개시",
      link:"https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R3015",
      linkLabel:"규정 (EU) 2024/3015", tag:"강제노동" },
    { id:"omnibus", abbr:"Omnibus", name:"지속가능성 간소화 패키지", status:"입법 협상 중", cls:"wip", key:null,
      desc:"CSRD·CSDDD·CBAM·택소노미 의무를 축소·연기하는 개정 패키지. 위 규제들의 최종 모습을 좌우하므로 협상 경과를 계속 확인해야 함.",
      timeline:"2025.2 제안 → stop-the-clock 2025.4 발효 → 실체 개정 협상 중",
      link:"https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32025L0794",
      linkLabel:"지침 (EU) 2025/794", tag:"Omnibus 간소화" },
    { id:"greenclaims", abbr:"그린클레임", name:"그린워싱 규제 (ECGT · 그린클레임 지침안)", status:"2026.9 ECGT 적용", cls:"soon",
      key:"2026-09-27", keyLabel:"ECGT 적용",
      desc:"근거 없는 친환경 표시·광고 규제. 그린클레임 지침안은 협상 표류 중이나, 소비자보호지침 개정(ECGT)에 따른 그린워싱 금지는 2026.9부터 적용.",
      timeline:"2023.3 지침안 제안(협상 중) → ECGT 2026.9.27 적용",
      link:"https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52023PC0166",
      linkLabel:"지침안 COM(2023) 166", tag:"그린워싱·표시" },
    { id:"taxonomy", abbr:"택소노미", name:"EU 녹색분류체계", status:"시행 중", cls:"live", key:null,
      desc:"환경적으로 지속가능한 경제활동의 판별 기준. 기업·금융기관의 녹색 매출·투자 비율 공시(제8조)에 사용되며 Omnibus로 간소화 논의 중.",
      timeline:"2020.7 발효 → 시행 중 → 공시 간소화 논의",
      link:"https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32020R0852",
      linkLabel:"규정 (EU) 2020/852", tag:"택소노미" },
    { id:"sfdr", abbr:"SFDR", name:"지속가능금융 공시 규정", status:"시행 중·개정 검토", cls:"live", key:null,
      desc:"금융기관·금융상품의 지속가능성 위험 및 영향 공시 의무. 펀드 분류(8조·9조) 체계 개편안 논의 중.",
      timeline:"2021.3 적용 → 시행 중 → 개정안 검토",
      link:"https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32019R2088",
      linkLabel:"규정 (EU) 2019/2088", tag:"SFDR 공시" },
    { id:"red", abbr:"RED III", name:"재생에너지 지침", status:"시행 중", cls:"live", key:null,
      desc:"EU 재생에너지 목표(2030년 42.5% 이상)와 산업·수송 부문 재생연료 사용 목표를 정한 지침. 회원국 대상 규제로 부품사 직접 의무는 없으나 고객사의 재생에너지 전환 요구와 연결되는 배경 규제.",
      timeline:"2023.11 발효 → 2025.5 회원국 전환기한 → 2030 목표",
      link:"https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023L2413",
      linkLabel:"지침 (EU) 2023/2413", tag:"재생에너지 RED" },
  ];

  /* ── 헬퍼 ── */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, c =>
      ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  }
  function fmtDate(d) {
    if (!d) return "";
    const dt = new Date(d), diff = (now - dt) / DAY;
    if (diff < 1) return "오늘";
    if (diff < 2) return "어제";
    if (diff < 8) return Math.floor(diff) + "일 전";
    return dt.toLocaleDateString("ko-KR", { year:"numeric", month:"short", day:"numeric" });
  }
  const daysTo = iso => Math.ceil((new Date(iso + "T00:00:00") - now) / DAY);

  /* ── 규제별 기사 풀 (신규 표시 포함) ── */
  REGS.forEach(r => {
    const pool = [], seen = new Set();
    (data.regnews || []).filter(x => x.tag === r.tag).forEach(x => {
      if (seen.has(x.link)) return; seen.add(x.link);
      pool.push({ date:x.date, link:x.link, title:x.title_ko || x.title,
                  src:x.media || "뉴스 검색", isnew:!!x.new, alert:x.alert || null });
    });
    (data.items || []).filter(it => it.tags.includes(r.tag)).forEach(it => {
      if (seen.has(it.link)) return; seen.add(it.link);
      pool.push({ date:it.date, link:it.link, title:it.title_ko || it.title,
                  src:(srcById[it.source] || { name: it.source }).name,
                  isnew:!!it.new, alert:it.alert || null });
    });
    // 확인 필요 기사를 맨 위로, 그 다음 최신순
    pool.sort((a, b) => ((b.alert ? 1 : 0) - (a.alert ? 1 : 0)) ||
      (b.date || "").localeCompare(a.date || ""));
    r.pool = pool;
    r.alertN = pool.filter(x => x.alert).length;
    r.newN = pool.filter(x => x.isnew).length;
    r.new7 = pool.filter(x => x.date && (now - new Date(x.date)) < 7 * DAY).length;
    r.dday = r.key ? daysTo(r.key) : null;
    r.urgent = r.dday !== null && r.dday <= 180;
  });

  const newTotal = (data.items || []).filter(i => i.new).length +
                   (data.regnews || []).filter(i => i.new).length;
  const alertTotal = (data.items || []).filter(i => i.alert).length +
                     (data.regnews || []).filter(i => i.alert).length;

  /* ── 색상 ── */
  const C = {
    live:  { c:"var(--ok)",     w:"var(--ok-wash)" },
    soon:  { c:"var(--warn)",   w:"var(--warn-wash)" },
    wip:   { c:"var(--idle)",   w:"var(--idle-wash)" },
    urgent:{ c:"var(--urgent)", w:"var(--urgent-wash)" },
  };
  const colorOf = r => C[r.urgent ? "urgent" : r.cls];

  /* ── 우리 회사 프로필 ── */
  const SIZES  = [["large","대기업"], ["mid","중견기업"], ["small","중소기업"]];
  const ROUTES = [["export","EU 직수출"], ["domestic","완성차·1차사 납품 (현대차그룹 등)"], ["both","둘 다"]];
  const GOODS  = [["steel","철강·알루미늄 (차체·샤시·구동계)"], ["battery","배터리·전장 (전기차 부품)"], ["bio","고무·가죽·목재 (타이어·내장재·포장)"]];
  const LV = {
    direct:   { t:"직접 적용", c:"var(--urgent)",    w:"var(--urgent-wash)", rank:0 },
    indirect: { t:"간접 영향", c:"var(--warn)",      w:"var(--warn-wash)",   rank:1 },
    watch:    { t:"주시 필요", c:"var(--brand-ink)", w:"var(--brand-wash)",  rank:2 },
    low:      { t:"관련 낮음", c:"var(--idle)",      w:"var(--idle-wash)",   rank:3 },
  };

  const P = { size:null, route:null, goods:new Set(), hideLow:false };
  try {
    const raw = localStorage.getItem("kmb-esg-profile");
    if (raw) {
      const o = JSON.parse(raw);
      P.size = o.size || null; P.route = o.route || null;
      P.goods = new Set(o.goods || []); P.hideLow = !!o.hideLow;
    }
  } catch (e) { /* 저장소 사용 불가 시 무시 */ }
  function saveP() {
    try {
      localStorage.setItem("kmb-esg-profile",
        JSON.stringify({ size:P.size, route:P.route, goods:[...P.goods], hideLow:P.hideLow }));
    } catch (e) { /* 무시 */ }
  }
  const isSet = () => !!(P.size && P.route);
  const exports_ = () => P.route === "export" || P.route === "both";
  const has = g => P.goods.has(g);

  const APPLIC = {
    "CSDDD": () => P.size === "large" && exports_()
      ? { lv:"direct", why:"EU 연매출 4.5억 유로를 넘으면 직접 적용 대상입니다. 그 미만이어도 완성차·1차사의 협력사 실사 요구는 동일하게 발생합니다." }
      : { lv:"indirect", why:"직접 적용 대상은 아니지만, 고객사가 공급망 실사를 수행하면서 인권·환경 점검, 자료 제출, 시정조치 요구를 받게 됩니다." },
    "CSRD": () => P.size === "large"
      ? { lv:"direct", why:"EU 자회사·지점을 보유하고 요건을 넘으면 직접 공시 대상입니다. 아니어도 고객사 ESRS 보고용 데이터 제출 요구가 발생합니다." }
      : { lv:"indirect", why:"직접 공시 의무는 없으나, 고객사의 ESRS 보고에 필요한 배출량·에너지·인력 데이터를 정해진 양식으로 제출해야 합니다." },
    "EUDR": () => !has("bio")
      ? { lv:"low", why:"고무·가죽·목재 등 대상 품목을 취급하지 않아 관련성이 낮습니다. 다만 목재 포장재(팔레트)를 쓰면 확인이 필요합니다." }
      : (exports_()
        ? { lv:"direct", why:"고무·가죽·목재 파생제품을 EU 시장에 출시하므로 실사선언(DDS) 제출 의무가 있습니다. 중소기업은 2027.6.30부터 적용됩니다." }
        : { lv:"indirect", why:"EU 출시 주체는 아니지만, 고객사의 DDS 작성을 위해 원산지 지리좌표와 합법성 증빙을 제출해야 합니다." }),
    "CBAM": () => !has("steel")
      ? { lv:"low", why:"철강·알루미늄 등 대상 품목을 취급하지 않아 관련성이 낮습니다." }
      : (exports_()
        ? { lv:"direct", why:"철강·알루미늄 부품을 EU로 수출하면 수입자에게 내재배출량 데이터를 제공해야 합니다. 미제공 시 불리한 기본값이 적용돼 가격 경쟁력이 떨어집니다." }
        : { lv:"indirect", why:"고객사의 EU 수출품에 부품이 포함되면 공정별 배출량 산정 자료 요구가 내려옵니다." }),
    "배터리": () => !has("battery")
      ? { lv:"low", why:"배터리·전기차 관련 품목을 취급하지 않아 관련성이 낮습니다." }
      : (exports_()
        ? { lv:"direct", why:"배터리를 EU 시장에 출시하면 탄소발자국 신고, 재활용 원료 비율, 배터리 여권 의무가 적용됩니다. 공급망 실사는 매출 4천만 유로 이상에 적용됩니다." }
        : { lv:"indirect", why:"배터리 제조사·완성차의 배터리 여권 작성을 위해 소재 구성, 탄소발자국, 재활용 원료 정보를 제출해야 합니다." }),
    "PPWR": () => exports_()
      ? { lv:"direct", why:"제품과 함께 EU 시장에 반입되는 포장(운송·산업 포장 포함)에 재활용 설계·표시·최소화 요건이 적용됩니다. 포장 재질·사양 점검이 필요합니다." }
      : { lv:"indirect", why:"완성차·1차사의 포장 지침 변경(재사용 용기, 재생원료 비율 등)으로 납품 포장 사양 요구가 내려올 수 있습니다." },
    "ESPR": () => (has("steel") || has("bio"))
      ? (exports_()
        ? { lv:"direct", why:"1차 작업계획에 철강·알루미늄·타이어가 포함되어, 품목별 위임법이 확정되면 에코디자인 요건과 디지털 제품 여권(DPP) 의무가 적용될 수 있습니다." }
        : { lv:"indirect", why:"고객사 제품의 DPP 작성에 필요한 소재 구성·재생원료·내구성 데이터 제출 요구가 예상됩니다." })
      : { lv:"watch", why:"거의 모든 물리 제품이 잠재 대상이며 품목별 위임법에 따라 적용이 확정됩니다. 취급 품목의 작업계획 포함 여부를 주시해야 합니다." },
    "ELVR": () => ({ lv:"watch", why:"협상 중인 규정안으로 확정 전이지만, 차량 설계·소재 요건이 확정되면 완성차 사양을 통해 전 부품사에 파급됩니다. 재생 플라스틱 비율과 탈거 용이 설계 논의를 주시해야 합니다." }),
    "RED III": () => ({ lv:"low", why:"회원국 대상 지침으로 부품사에 직접 의무는 없습니다. 고객사의 재생에너지 사용 요구와 사업장 전력 조달 계획의 배경 규제로 참고하시면 됩니다." }),
    "FLR": () => exports_()
      ? { lv:"direct", why:"품목·기업 규모 제한 없이 EU 시장의 모든 제품에 적용됩니다. 강제노동이 입증되면 회수·폐기 명령까지 가능합니다." }
      : { lv:"indirect", why:"EU 출시 제품에 부품이 포함되면 조사 범위에 들어갑니다. 고객사의 강제노동 리스크 점검과 원자재 소싱 이력 요구를 받게 됩니다." },
    "Omnibus": () => ({ lv:"watch", why:"이 패키지 자체의 적용 대상은 아니지만, CSRD·CSDDD의 적용 범위와 시기를 좌우하므로 협상 경과를 계속 확인해야 합니다." }),
    "택소노미": () => P.size === "large"
      ? { lv:"indirect", why:"CSRD 공시 대상이면 제8조에 따라 녹색 매출·투자 비율을 함께 공시해야 합니다." }
      : { lv:"low", why:"직접 공시 대상은 아닙니다. 다만 금융기관에서 녹색 대출·투자를 받을 때 분류 적합성 자료를 요구받을 수 있습니다." },
    "SFDR": () => ({ lv:"low", why:"금융기관 대상 규제로 부품사에 직접 적용되지 않습니다. 투자 유치나 대출 심사에서 ESG 자료 요구 형태로 간접 접점이 생깁니다." }),
    "그린클레임": () => P.size === "large" && exports_()
      ? { lv:"indirect", why:"소비자 대상 표시·광고 규제입니다. 제품이나 홍보에 '친환경·탄소중립' 문구를 쓰면 검증 근거를 갖춰야 합니다." }
      : { lv:"low", why:"B2B 부품사는 관련성이 낮습니다. 다만 자사 홍보물에 친환경 문구를 쓸 경우 근거 자료가 필요합니다." },
  };
  function assess() {
    REGS.forEach(r => {
      r.ap = isSet() && APPLIC[r.abbr] ? APPLIC[r.abbr]() : null;
    });
  }

  /* ── 규제 상세: 적용 기준·시행 일정·벌칙·공식 가이던스 (2026.7 기준) ── */
  const REG_DETAILS = {
    csddd: {
      scope: [
        ["EU 기업", "직원 1,000명 초과이면서 전 세계 순매출 4.5억 유로 초과인 기업"],
        ["역외(한국 본사) 기업", "EU 역내 순매출이 4.5억 유로를 초과하면 본사 소재지와 무관하게 적용"],
        ["의무 내용", "자사·자회사·활동사슬(공급망)의 인권·환경 부정영향 식별, 예방·완화, 시정, 공개 및 기후 전환계획 수립"],
        ["한국 부품사 관점", "직접 대상은 소수 대기업. 대부분은 적용 대상 고객사의 실사 과정에서 정보 제공·시정조치 요구를 받는 간접 적용"],
      ],
      phases: [
        ["2024.7.25", "지침 발효"],
        ["2027.7.26", "회원국 국내법 전환 기한 (stop-the-clock으로 1년 연기)"],
        ["2028.7.26", "1차 적용 개시 — 초대형 기업부터 단계 적용"],
      ],
      penalty: "회원국은 전 세계 순매출의 최대 5% 이상을 상한으로 하는 과징금을 도입해야 하며, 시정명령 불이행 시 이행강제금이 부과될 수 있습니다. 민사책임 조항은 Omnibus 협상에서 완화가 논의되고 있습니다.",
      note: "적용 범위·시기는 Omnibus 실체 개정 협상 결과에 따라 변동될 수 있습니다.",
      guidance: [
        { t: "EU 집행위 CSDDD 안내 페이지", u: "https://commission.europa.eu/business-economy-euro/doing-business-eu/sustainability-due-diligence-responsible-business/corporate-sustainability-due-diligence_en" },
      ],
    },
    csrd: {
      scope: [
        ["1차 대상", "기존 NFRD 대상 대형 상장사(직원 500명 초과) — 2024 회계연도부터 보고 중"],
        ["2차 대상", "대형 기업(직원 250명·매출 5,000만 유로·자산 2,500만 유로 중 2개 충족) — stop-the-clock으로 2027 회계연도로 연기"],
        ["3차 대상", "상장 중소기업 — 2028 회계연도로 연기"],
        ["역외(한국 본사) 기업", "EU 내 매출 1.5억 유로 초과 + EU 자회사·지점 보유 시 2028 회계연도부터 그룹 단위 보고"],
        ["한국 부품사 관점", "직접 공시 대상은 드물지만, 고객사 ESRS 보고용 데이터(배출량·에너지·인력) 제출 요구가 현실적인 부담"],
      ],
      phases: [
        ["2023.1.5", "지침 발효"],
        ["2025", "1차 대상 2024 회계연도 보고 개시"],
        ["2025.4.17", "stop-the-clock 발효 — 2·3차 대상 2년 연기"],
        ["협상 중", "Omnibus 실체 개정 — 대상을 직원 1,000명 초과로 축소하는 안 논의"],
      ],
      penalty: "제재는 회원국 국내법에 위임되어 있으며 허위·미공시에 과태료 등이 부과됩니다. 실무적으로는 고객사·투자자 요구 미충족이 더 직접적인 불이익입니다.",
      note: "적용 대상 축소(Omnibus)가 협상 중이므로 2·3차 대상 기업은 경과를 확인해야 합니다.",
      guidance: [
        { t: "ESRS 위임규정 (EU) 2023/2772", u: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R2772" },
        { t: "EU 집행위 기업 지속가능성 보고 페이지", u: "https://finance.ec.europa.eu/capital-markets-union-and-financial-markets/company-reporting-and-auditing/company-reporting/corporate-sustainability-reporting_en" },
        { t: "EFRAG (ESRS 이행 가이던스)", u: "https://www.efrag.org" },
      ],
    },
    eudr: {
      scope: [
        ["대상 품목", "소·코코아·커피·팜유·고무·대두·목재 및 부속서 I 파생제품 — 타이어, 방진고무, 가죽 시트, 목재 포장재 등"],
        ["의무 주체", "대상 제품을 EU 시장에 출시하거나 수출하는 사업자(operator)와 유통업자(trader)"],
        ["의무 내용", "산림전용 무관(2020.12.31 이후 기준)과 생산국 법령 준수 입증 — 원산지 지리좌표를 포함한 실사선언(DDS) 제출"],
        ["한국 부품사 관점", "EU 직수출 시 직접 의무. 완성차 납품 시 고객사 DDS 작성용 좌표·증빙 제공 요구"],
      ],
      phases: [
        ["2023.6.29", "규정 발효"],
        ["2024.12", "적용 1년 연기 확정"],
        ["2026.12.30", "대기업·중견기업 적용"],
        ["2027.6.30", "소기업·영세기업 적용"],
      ],
      penalty: "EU 연매출의 최소 4%를 상한으로 하는 과징금, 제품·수익 몰수, 공공조달 입찰 배제 등이 규정되어 있습니다.",
      guidance: [
        { t: "EU 집행위 EUDR 페이지 (가이던스·FAQ)", u: "https://environment.ec.europa.eu/topics/forests/deforestation/regulation-deforestation-free-products_en" },
      ],
    },
    cbam: {
      scope: [
        ["대상 품목", "철강·알루미늄(나사·볼트 등 가공품 포함)·시멘트·비료·수소·전력 — CN코드 기준 부속서 I"],
        ["의무 주체", "EU 수입자(인가 신고인). 한국 수출기업은 법적 의무자는 아니나 배출량 데이터 제공 없이는 거래 유지가 어려움"],
        ["소량 면제", "연간 50톤 미만 수입자는 면제 (2025 간소화 개정)"],
        ["한국 부품사 관점", "철강·알루미늄 부품 EU 수출 시 공정별 내재배출량 산정·제공 필요. 미제공 시 불리한 기본값이 적용돼 가격경쟁력 하락"],
      ],
      phases: [
        ["2023.10.1", "전환기간 개시 — 분기별 배출량 보고"],
        ["2026.1.1", "본격 시행 — 인가 신고인 등록·연례 신고"],
        ["2027.2", "CBAM 인증서 판매 개시 (2026년분부터 비용 부과)"],
      ],
      penalty: "미보고·허위보고 시 톤당 과태료(전환기간 10~50유로)가 부과되며, 본격 시행 후 인증서 미제출 시 톤당 100유로 이상의 벌금과 함께 제출 의무가 유지됩니다.",
      guidance: [
        { t: "EU 집행위 CBAM 페이지 (이행규정·산정 방법론)", u: "https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism_en" },
      ],
    },
    battery: {
      scope: [
        ["대상", "EU 시장에 출시되는 모든 배터리 — 전기차·산업용·휴대용·LMT·시동용(SLI)"],
        ["공급망 실사", "연매출 4,000만 유로 초과 사업자 (2025.8부터)"],
        ["배터리 여권", "2027.2.18부터 전기차·LMT·2kWh 초과 산업용 배터리에 의무"],
        ["한국 부품사 관점", "배터리 셀·모듈·소재 납품 시 탄소발자국, 재활용 원료 비율, 소재 구성 데이터를 고객사 여권 작성용으로 제출"],
      ],
      phases: [
        ["2023.8.17", "규정 발효"],
        ["2025.2", "전기차 배터리 탄소발자국 신고 단계 개시"],
        ["2025.8.18", "공급망 실사 의무 적용"],
        ["2027.2.18", "배터리 여권 의무화"],
        ["2031~", "재활용 원료 최소 비율 적용"],
      ],
      penalty: "회원국별 제재와 함께 요건 미충족 배터리는 시장 출시 금지·회수 대상이 됩니다.",
      guidance: [
        { t: "EU 집행위 배터리 규정 페이지", u: "https://environment.ec.europa.eu/topics/waste-and-recycling/batteries_en" },
      ],
    },
    ppwr: {
      scope: [
        ["대상", "EU 시장에 출시되는 모든 포장 — 소비자·운송·산업 포장, 재질 불문 (파렛트·크레이트·완충재 포함)"],
        ["주요 의무", "재활용 가능 설계(2030), 플라스틱 포장 재생원료 최소 비율, 포장 최소화, 표시(라벨) 통일, 일부 단일사용 포장 제한, 재사용 목표"],
        ["의무 주체", "포장된 제품을 EU 시장에 출시하는 제조·수입·유통업자"],
        ["한국 부품사 관점", "EU 수출 시 제품 포장·운송 포장이 직접 대상. 납품 시에는 고객사 포장 지침(재사용 용기, 재질 기준) 변경으로 이어질 수 있음"],
      ],
      phases: [
        ["2025.2.11", "규정 발효"],
        ["2026.8.12", "적용 개시"],
        ["2030.1.1", "재활용 설계 기준·재생원료 최소 비율 적용"],
        ["2040", "재생원료 등 강화 목표"],
      ],
      penalty: "회원국별 제재와 함께 요건을 충족하지 못하는 포장은 시장 출시가 제한됩니다.",
      guidance: [
        { t: "EU 집행위 포장·포장폐기물 페이지", u: "https://environment.ec.europa.eu/topics/waste-and-recycling/packaging-waste_en" },
      ],
    },
    espr: {
      scope: [
        ["대상", "EU 시장에 출시되는 거의 모든 물리적 제품 (식품·의약품 등 일부 제외) — 품목별 위임법으로 요건 확정"],
        ["핵심 수단", "품목별 에코디자인 요건(내구성·수리성·재활용성·재생원료·탄소발자국)과 디지털 제품 여권(DPP)"],
        ["1차 작업계획", "2025.4 발표 — 철강, 알루미늄, 섬유·의류, 가구, 타이어, 매트리스 등 우선 품목 지정"],
        ["한국 부품사 관점", "철강·알루미늄 중간재와 타이어가 우선 품목에 포함 — 위임법 확정 시 소재 구성·재생원료 데이터와 DPP 대응 필요"],
      ],
      phases: [
        ["2024.7.18", "규정 발효"],
        ["2025.4", "1차 작업계획 발표 (우선 품목 지정)"],
        ["2026~", "품목별 위임법 제정 진행"],
        ["미정", "품목별 위임법 발효 후 에코디자인 요건·DPP 의무 적용"],
      ],
      penalty: "회원국별 제재와 함께 요건 미충족 제품은 시장 출시가 제한됩니다. 세부 요건과 적용 시기는 품목별 위임법에서 확정됩니다.",
      note: "품목별 요건이 위임법으로 확정되는 구조라 대상·시기가 품목마다 다릅니다.",
      guidance: [
        { t: "EU 집행위 ESPR 페이지", u: "https://commission.europa.eu/energy-climate-change-environment/standards-tools-and-labels/products-labelling-rules-and-requirements/ecodesign-sustainable-products-regulation_en" },
      ],
    },
    elvr: {
      scope: [
        ["대상", "EU 시장 차량의 설계·생산·수리·폐차 전 과정 (규정안 — 확정 전)"],
        ["핵심 요건(안)", "신차 플라스틱의 재생원료 25%(그중 일부는 폐차 유래), 재활용성 설계, 부품 탈거·재사용 용이성, 생산자책임 확대"],
        ["연계 구조", "완성차 형식승인(3R)과 연계 — 요건 미충족 시 차량 인증에 영향"],
        ["한국 부품사 관점", "플라스틱 부품의 재생원료 비율과 탈거 용이 설계가 완성차 사양·납품 조건으로 내려올 전망. 수치·시기는 협상 결과에 따라 변동"],
      ],
      phases: [
        ["2023.7.13", "규정안 제안"],
        ["2025", "의회·이사회 심의"],
        ["협상 중", "3자 협상 — 재생원료 비율·적용 시기 조율"],
        ["미정", "발효 후 단계 적용"],
      ],
      penalty: "확정 전입니다. 규정안은 회원국 제재와 형식승인 연계를 예정하고 있습니다.",
      note: "입법 협상 중인 규정안으로 모든 수치와 일정은 변동될 수 있습니다.",
      guidance: [
        { t: "EU 집행위 폐차(ELV) 페이지", u: "https://environment.ec.europa.eu/topics/waste-and-recycling/end-life-vehicles_en" },
      ],
    },
    red: {
      scope: [
        ["대상", "EU 회원국 — 2030년 재생에너지 비중 최소 42.5%(목표 45%)와 산업·수송 부문 재생연료(RFNBO) 목표"],
        ["기업 의무", "기업에 대한 직접 의무는 없음 (회원국이 국내 제도로 이행)"],
        ["한국 부품사 관점", "고객사의 재생에너지 사용(RE100 등)·탄소중립 요구의 제도적 배경. 사업장 전력 조달(PPA·인증서) 계획과 연결"],
      ],
      phases: [
        ["2023.11.20", "RED III 발효"],
        ["2025.5.21", "회원국 국내법 전환 기한"],
        ["2030", "목표 연도"],
      ],
      penalty: "회원국 이행 의무 사항으로 개별 기업 제재는 없습니다.",
      guidance: [
        { t: "EU 집행위 재생에너지 지침 페이지", u: "https://energy.ec.europa.eu/topics/renewable-energy/renewable-energy-directive-targets-and-rules_en" },
      ],
    },
    flr: {
      scope: [
        ["대상", "강제노동으로 생산·채취·수확된 모든 제품 — 품목·기업 규모·원산지 제한 없음"],
        ["의무 주체", "EU 시장 판매·수출에 관여하는 모든 경제주체"],
        ["집행 방식", "당국 직권조사 — 역외 공급망은 집행위, 역내는 회원국 주관. 리스크 기반 접근"],
        ["한국 부품사 관점", "고위험 소싱(신장 관련 원자재 등) 이력 관리가 핵심. 조사 개시 시 공급망 이력 즉시 제출 요구"],
      ],
      phases: [
        ["2024.12.13", "규정 발효"],
        ["2026 중", "집행위 가이드라인·강제노동 리스크 데이터베이스 공개 예정"],
        ["2027.12.14", "적용 개시"],
      ],
      penalty: "강제노동 결부가 입증되면 제품의 시장 철수·기부·재활용·폐기 명령이 내려지고, 강제노동 제거를 입증할 때까지 재출시가 금지됩니다. 불이행 시 회원국 과태료가 부과됩니다.",
      guidance: [
        { t: "유럽의회 입법 트래커 (Legislative Train)", u: "https://www.europarl.europa.eu/legislative-train/" },
      ],
    },
    omnibus: {
      scope: [
        ["성격", "CSRD·CSDDD·CBAM·택소노미 의무를 축소·연기하는 개정 입법 패키지 (Omnibus I)"],
        ["확정 사항", "stop-the-clock (지침 2025/794): CSRD 2·3차 대상 2년, CSDDD 전환·적용 1년 연기 — 2025.4 발효"],
        ["협상 중", "CSRD 대상 축소(직원 1,000명 초과), CSDDD 실사 범위 직접 협력사 중심 완화, 민사책임 조항 삭제 등"],
        ["한국 부품사 관점", "의무 완화가 확정되기 전까지 고객사 요구는 유지 — 협상 결과가 나올 때마다 대응 계획 재점검 필요"],
      ],
      phases: [
        ["2025.2.26", "패키지 제안"],
        ["2025.4.17", "stop-the-clock 발효"],
        ["협상 중", "실체 개정안 3자 협상(트릴로그) 진행"],
      ],
      penalty: "해당 없음 (개정 입법 패키지)",
      guidance: [
        { t: "유럽의회 입법 트래커 (Legislative Train)", u: "https://www.europarl.europa.eu/legislative-train/" },
      ],
    },
    greenclaims: {
      scope: [
        ["ECGT (확정)", "소비자 거래에서 근거 없는 일반적 환경 주장('친환경' 등)과 미검증 지속가능성 라벨 금지 — 2026.9.27 적용"],
        ["그린클레임 지침안 (협상 중)", "명시적 환경 주장에 사전 실증·제3자 검증 의무 부과 — 협상 표류, 철회 논란"],
        ["한국 부품사 관점", "B2C 접점은 적으나 자사 홍보물과 완성차에 제공하는 친환경 소재 주장에 근거 자료(LCA·인증) 필요"],
      ],
      phases: [
        ["2024.3.26", "ECGT(지침 2024/825) 발효"],
        ["2026.3.27", "ECGT 국내법 전환 기한"],
        ["2026.9.27", "ECGT 적용 개시"],
        ["협상 중", "그린클레임 지침안"],
      ],
      penalty: "회원국 소비자보호법에 따른 제재 — 매출 비례 과징금과 판매 금지 조치가 가능합니다.",
      guidance: [
        { t: "ECGT 지침 (EU) 2024/825 원문", u: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024L0825" },
      ],
    },
    taxonomy: {
      scope: [
        ["대상", "CSRD 공시 대상 기업(제8조: 녹색 매출·CapEx·OpEx 비율 공시)과 금융시장 참여자"],
        ["판별 구조", "6대 환경목표에 실질 기여 + 다른 목표에 중대한 피해 없음(DNSH) + 최소 사회안전장치 충족"],
        ["한국 부품사 관점", "직접 공시 의무는 없으나 전기차 부품 등 녹색 활동 매출 분류 자료를 고객사·금융기관이 요구할 수 있음"],
      ],
      phases: [
        ["2020.7.12", "규정 발효"],
        ["2022.1", "기후 위임법 적용"],
        ["2024.1", "나머지 4개 환경목표 위임법 적용"],
        ["논의 중", "Omnibus 간소화 — 중견 이하 공시 자율화"],
      ],
      penalty: "공시 위반은 CSRD·SFDR 제재 체계를 따릅니다.",
      guidance: [
        { t: "EU Taxonomy Navigator", u: "https://ec.europa.eu/sustainable-finance-taxonomy/" },
      ],
    },
    sfdr: {
      scope: [
        ["대상", "금융시장참여자(자산운용·보험·연기금)와 금융자문업자 — 부품 제조사는 직접 대상 아님"],
        ["의무 내용", "지속가능성 위험 통합, 주요 부정영향(PAI) 공시, 8조·9조 상품 분류 공시"],
        ["한국 부품사 관점", "투자 유치·대출 심사에서 금융기관의 ESG 실사 자료 요구로 간접 접점"],
      ],
      phases: [
        ["2021.3.10", "적용 개시"],
        ["2023.1", "RTS(세부 기술기준) 적용"],
        ["검토 중", "SFDR 2.0 개정안 — 상품 분류 체계 개편"],
      ],
      penalty: "금융감독당국의 제재 대상입니다 (부품사 해당 없음).",
      guidance: [
        { t: "EU 집행위 SFDR 페이지", u: "https://finance.ec.europa.eu/regulation-and-supervision/financial-services-legislation/implementing-and-delegated-acts/sustainable-finance-disclosures-regulation_en" },
      ],
    },
  };

  /* ── 고객사 요구로 이어지는 구조 — 규제 조문상 의무가 공급망을 따라 전가되는 방식.
     특정 완성차의 정책·행보에 대한 서술은 넣지 않는다 (언론 보도로 확인된 것만 별도 반영). ── */
  const OEM_NOTES = {
    csddd: "이 규제가 적용되는 완성차·대기업은 자기 공급망에 인권·환경 문제가 없는지 점검할 의무가 생깁니다. 그래서 협력사에게 실사 설문 응답, 자료 제출, 문제 발견 시 개선 요구가 올 수 있습니다.",
    csrd: "공시 대상 기업은 지속가능성 보고서에 공급망 정보까지 담아야 합니다. 그래서 고객사가 협력사에게 전기 사용량, 탄소 배출량 같은 데이터를 정해진 양식으로 요구할 수 있습니다.",
    eudr: "타이어·가죽시트 같은 제품을 EU에 내놓는 회사는 '원료가 산림을 훼손하지 않았다'는 신고를 해야 합니다. 그 신고에 원산지 위치 정보가 필요하기 때문에, 납품하는 협력사에게 원료의 원산지 좌표와 증빙을 요구할 수 있습니다.",
    cbam: "탄소국경 신고는 EU에서 수입하는 회사가 합니다. 그래서 철강·알루미늄 부품을 납품하는 기업에게 '만들 때 나온 탄소량' 자료를 요구하게 됩니다. 자료를 제출하지 못하면 불리한 기본값으로 계산돼 가격 경쟁력이 떨어집니다.",
    battery: "배터리를 EU에 파는 회사는 '배터리 여권'이라는 정보 묶음(소재 구성, 재활용 원료 비율, 탄소발자국)을 만들어야 합니다. 그 정보의 상당 부분이 부품·소재사에서 나오기 때문에 협력사에게 데이터 제출 요구가 올 수 있습니다.",
    ppwr: "포장된 제품을 EU에 내놓는 회사는 포장이 기준(재활용 가능한 설계, 표시 등)에 맞는지 확인해야 합니다. 그래서 납품 포장(파렛트·상자·완충재)의 재질 정보를 요구하거나, 포장 방식 변경을 요청할 수 있습니다.",
    espr: "품목별 세부 규정이 확정되면 제품마다 '디지털 제품 여권'(소재·재활용 정보가 담긴 전자 이력서)이 필요해집니다. 철강·알루미늄·타이어가 우선 품목이라, 확정되면 협력사에게 소재 정보 제출 요구가 올 수 있습니다.",
    elvr: "아직 협상 중인 법안이지만, 확정되면 차를 설계할 때부터 재활용을 고려하고 재생 플라스틱을 일정 비율 써야 합니다. 차량 인증과 연결되는 규제라, 완성차가 부품 사양(재생원료 비율, 분리하기 쉬운 설계)으로 협력사에게 요구하는 방식으로 이어질 수 있습니다.",
    red: "EU 국가들의 재생에너지 목표를 정한 규제로 기업에 직접 의무는 없습니다. 다만 고객사가 '재생에너지로 만든 부품'을 원하는 흐름의 배경이 되는 규제입니다.",
    flr: "강제노동으로 만든 제품은 EU에서 팔 수 없고, 적발되면 회수·폐기까지 됩니다. 조사가 시작되면 원료 조달 이력을 제출해야 하므로, 고객사가 평소에 협력사의 소싱 이력 자료를 요구할 수 있습니다.",
    omnibus: "규제 부담을 줄이는 방향의 개정 협상입니다. 다만 법이 완화돼도 고객사는 자체 기준으로 기존 요구를 유지할 수 있으니, 확정 내용과 고객사 공지를 함께 확인할 필요가 있습니다.",
    greenclaims: "'친환경', '탄소중립' 같은 문구를 근거 없이 쓰는 것을 금지하는 규제입니다. 완성차 홍보에 부품의 친환경 문구가 들어가면 협력사도 근거 자료(시험성적서·인증)를 요구받을 수 있습니다.",
    taxonomy: "어떤 사업이 '녹색'인지 판별하는 기준표입니다. 고객사나 은행이 녹색 매출 비율을 계산할 때 협력사의 제품 정보가 참조될 수 있습니다.",
    sfdr: "금융회사 대상 규제라 부품사와 직접 관련은 없습니다. 투자 유치나 대출 심사에서 ESG 자료를 요구받는 정도의 간접 접점만 있습니다.",
  };

  /* ── 공통 UI: 네비 신규 점 + 푸터 출처 ── */
  function navInit() {
    // 빨간 점 = 확인 필요 신호가 있을 때만 ('확인 필요' 메뉴에 표시)
    const na = document.getElementById("navAlerts");
    if (na && alertTotal > 0) {
      const s = document.createElement("span");
      s.className = "ndot";
      s.title = "확인 필요 " + alertTotal + "건";
      na.appendChild(s);
    }
    const fl = document.getElementById("srcList");
    if (fl) fl.innerHTML = (data.sources || []).map(s =>
      '<li><a href="' + esc(s.home) + '" target="_blank" rel="noopener">' + esc(s.name) +
      "</a> — " + esc(s.desc) + "</li>").join("");
    const g = document.getElementById("genLine");
    if (g && data.generated) {
      g.innerHTML =
        '<span class="gchip">마지막 수집 ' + fmtDate(data.generated) + "</span>" +
        (alertTotal > 0
          ? '<span class="gchip hot">확인 필요 ' + alertTotal + "건</span>"
          : '<span class="gchip">확인 필요 없음</span>') +
        (newTotal > 0 ? '<span class="gchip">신규 수집 ' + newTotal + "건</span>" : "") +
        '<span class="gchip">매주 월요일 09:00 자동 수집</span>';
    }
  }

  return { data, now, DAY, EU, srcById, REGS, esc, fmtDate, daysTo, colorOf, LV,
           SIZES, ROUTES, GOODS, APPLIC, P, saveP, isSet, assess, newTotal, alertTotal, navInit,
           OEM_NOTES, REG_DETAILS };
})();
