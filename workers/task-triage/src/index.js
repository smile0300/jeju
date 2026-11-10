/**
 * 작업 큐 판정 Worker
 * 위챗 접수 → 운영자가 구글 시트에 등록(상태 비움/대기) → 이 Worker가 Jev로 판정 → 상태를 바꿔 둠
 * → Claude 예약 작업은 '처리가능' 행만 처리한다. (Claude 토큰은 판정에 쓰지 않음)
 *
 * Jev 판정은 거르는 단계일 뿐 실행 허가가 아니다. push·발송 등은 Claude 쪽에서 따로 승인받는다.
 */

import { jejuFill, jejuSubmit, jejuRecord } from './fill.js';
import { GU_BY_REGION } from './gu.js';

const JEV_URL ='https://api.typesafe.ai/v1/systemone';
const MAX_ROWS_PER_RUN = 10;

// 이 값보다 확신이 낮으면 '확인필요'로 돌려보낸다
const MIN_CONFIDENCE = 0.6;

const QUESTIONS = {
  category: {
    type: 'choice',
    instructions: 'This is a work request for jeju-live.com, a Jeju travel info website for Chinese and foreign tourists. Which kind of work is it?',
    criteria: {
      i18n: 'Translation or text changes in ko/en/zh strings',
      css: 'Layout, style, mobile display, visual breakage',
      bug: 'Something on the site is broken or shows wrong data',
      content: 'Add or update content: festivals, courses, restaurants, guides',
      data: 'Public data API, Google Sheets, reservation or lost-item records',
      out_of_scope: 'Not a website task, or cannot be done by editing this codebase'
    }
  },
  needs_deep: {
    type: 'noul',
    instructions: 'Does this need architecture design or debugging with an unknown cause, rather than a routine fix?'
  },
  needs_approval: {
    type: 'noul',
    instructions: 'Does this involve deploying or pushing to production, writing to the live operations sheet, sending messages to customers, payments, or account/credential changes?'
  },
  is_clear: {
    type: 'noul',
    instructions: 'Is the request specific enough that a developer knows exactly what to change without asking back?'
  }
};

async function callGas(env, payload) {
  const res = await fetch(String(env.TASK_GAS_URL).trim(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, _secret: String(env.TASK_SECRET || '').trim() })
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('GAS 응답을 읽을 수 없습니다 (' + res.status + ')');
  }
  if (data.result !== 'success') throw new Error('GAS 오류: ' + data.message);
  return data;
}

async function askJev(env, state, questions = QUESTIONS) {
  const key = String(env.TYPESAFE_API_KEY || '').trim();
  const res = await fetch(JEV_URL, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + key,
      'x-api-key': key,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model: 'jev-latest', state, questions })
  });
  // 키 값은 남기지 않고 길이만 (빈 키인지 구분용)
  if (!res.ok) throw new Error(`Jev ${res.status} (키 길이 ${key.length}): ` + (await res.text()).slice(0, 200));
  return (await res.json()).answers;
}

/** Jev 답을 시트에 쓸 칸으로 바꾼다 */
function decide(answers) {
  const cat = answers.category || {};
  const deep = Number(answers.needs_deep?.noul ?? 0);
  const approval = Number(answers.needs_approval?.noul ?? 0);
  const clear = Number(answers.is_clear?.noul ?? 0);
  const catConf = Number(cat.confidence ?? 0);

  let status = '처리가능';
  if (cat.choice === 'out_of_scope' || clear < MIN_CONFIDENCE || catConf < MIN_CONFIDENCE) status = '확인필요';
  else if (approval >= 0.5) status = '승인필요';

  return {
    '상태': status,
    'Jev분류': cat.choice || '',
    'Jev모델': deep >= 0.5 ? 'opus' : 'sonnet',
    'Jev확신도': `분류 ${catConf.toFixed(2)} / 명확 ${clear.toFixed(2)}`,
    'Jev승인필요': approval.toFixed(2),
    '판정일시': new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
  };
}

async function triage(env) {
  const { rows } = await callGas(env, { type: 'task_list', status: '대기' });
  const results = [];
  for (const row of rows.slice(0, MAX_ROWS_PER_RUN)) {
    const state = { 요청내용: row['요청내용'], 참고: row['참고(링크·위챗ID 등)'] || '' };
    if (!String(state.요청내용 || '').trim()) continue;
    try {
      const fields = decide(await askJev(env, state));
      await callGas(env, { type: 'task_update', row: row.row, fields });
      results.push({ row: row.row, ...fields });
    } catch (e) {
      // 한 행이 실패해도 나머지는 계속 (다음 크론에 다시 시도됨)
      console.error('[triage] row', row.row, e.message);
      results.push({ row: row.row, error: e.message });
    }
  }
  return results;
}

// ─── 분실물 (LostReport) ─────────────────────────────────────────
// 분실 접수 한 줄 → Jev로 분류 → 경찰청 습득물 API 검색 → Jev로 같은 물건인지 판정 → 큐에 추가 + 관리자 푸시
// 경찰청 분실신고(minwon24) 등록은 로그인·제출 승인이 필요해서 여기서 하지 않고 큐에 '등록대기'로 남긴다.

const DEFAULT_NOTIFY_URL = 'https://jeju-weather-alerts.smile0300.workers.dev/api/notify-admin';
const FOUND_ENDPOINTS = [
  'https://apis.data.go.kr/1320000/LosfundInfoInqireService/getLosfundInfoAccToClAreaPd',
  'https://apis.data.go.kr/1320000/LosPtfundInfoInqireService/getPtLosfundInfoAccToClAreaPd'
];
const SEARCH_DAYS_AFTER_LOSS = 30;

// 습득물 API 지역 코드 (N_FD_LCT_CD) — 공식 코드표를 못 찾아서 코드별 보관 장소(depPlace)를 조회해 맞춘 값 (2026-11-02)
// 광주·전남은 LCG000에 섞여 나오고 LCQ000(광주)·LCL000(전남)에는 경찰서 단위만 조금 있어서 같이 검색한다.
const REGIONS = {
  jeju: { label: 'Jeju Island (제주)', codes: ['LCP000'] },
  seoul: { label: 'Seoul (서울)', codes: ['LCA000'] },
  incheon: { label: 'Incheon, including Incheon Airport (인천)', codes: ['LCV000'] },
  gyeonggi: { label: 'Gyeonggi province (경기)', codes: ['LCI000'] },
  busan: { label: 'Busan, including Gimhae Airport area (부산)', codes: ['LCT000'] },
  daegu: { label: 'Daegu (대구)', codes: ['LCR000'] },
  daejeon: { label: 'Daejeon (대전)', codes: ['LCS000'] },
  gwangju: { label: 'Gwangju (광주)', codes: ['LCG000', 'LCQ000'] },
  ulsan: { label: 'Ulsan (울산)', codes: ['LCU000'] },
  sejong: { label: 'Sejong (세종)', codes: ['LCW000'] },
  gangwon: { label: 'Gangwon province (강원)', codes: ['LCH000'] },
  chungbuk: { label: 'North Chungcheong (충북)', codes: ['LCO000'] },
  chungnam: { label: 'South Chungcheong (충남)', codes: ['LCN000'] },
  jeonbuk: { label: 'North Jeolla (전북)', codes: ['LCM000'] },
  jeonnam: { label: 'South Jeolla (전남)', codes: ['LCG000', 'LCL000'] },
  gyeongbuk: { label: 'North Gyeongsang (경북)', codes: ['LCK000'] },
  gyeongnam: { label: 'South Gyeongsang (경남)', codes: ['LCJ000'] }
};
const regionCriteria = (extra) => ({ ...Object.fromEntries(Object.entries(REGIONS).map(([k, r]) => [k, r.label])), ...extra });

// minwon24 관서 찾기 팝업의 시·도 이름 앞부분 (광주·전남은 '전남광주통합특별시' 하나)
const SIDO_PREFIX = {
  jeju: '제주', seoul: '서울', incheon: '인천', gyeonggi: '경기', busan: '부산', daegu: '대구', daejeon: '대전',
  gwangju: '전남광주', ulsan: '울산', sejong: '세종', gangwon: '강원', chungbuk: '충청북', chungnam: '충청남',
  jeonbuk: '전북', jeonnam: '전남광주', gyeongbuk: '경상북', gyeongnam: '경상남'
};

// minwon24 분실물 신고서 코드 (2026-11-03 양식에서 읽은 값)
const PLACE_TYPES = {
  LL1001: 'Bus, airport limousine bus', LL1002: 'Taxi', LL1003: 'Subway', LL1004: 'Airport terminal',
  LL1005: 'Train', LL1008: 'Public office', LL1009: 'Amusement park', LL1010: 'Tourist spot, beach, park',
  LL1012: 'Department store, mall', LL1013: 'Shop, convenience store', LL1014: 'Restaurant, cafe, bar',
  LL1015: 'Street, outdoors', LL1016: 'House', LL1020: 'Cinema', LL1017: 'Hotel, guesthouse, rental car, other place',
  LL1018: 'Unknown place'
};
const PLACE_KO = { LL1001: '버스', LL1002: '택시', LL1003: '지하철', LL1004: '공항', LL1005: '기차', LL1008: '공공기관',
  LL1009: '놀이공원', LL1010: '유원지', LL1012: '백화점/매장', LL1013: '상점', LL1014: '음식점', LL1015: '노상',
  LL1016: '주택', LL1020: '영화관', LL1017: '기타', LL1018: '불상' };
const COLORS = {
  CL1001: 'White', CL1002: 'Black', CL1003: 'Red', CL1004: 'Orange', CL1005: 'Yellow', CL1006: 'Green',
  CL1007: 'Blue, sky blue, mint, navy', CL1008: 'Brown, beige', CL1009: 'Purple', CL1011: 'Pink',
  CL1019: 'Gray', CL1023: 'Silver', CL1010: 'Other or multicolor'
};
// 접수 양식 색상 버튼 값 → 신고서 색상 코드 ('기타'는 Jev 판정 사용)
const COLOR_BY_NAME = { 흰색: 'CL1001', 검정: 'CL1002', 빨강: 'CL1003', 파랑: 'CL1007', 초록: 'CL1006', 노랑: 'CL1005',
  갈색: 'CL1008', 분홍: 'CL1011', 회색: 'CL1019' };
const COLOR_KO = { CL1001: '흰색', CL1002: '검은색', CL1003: '빨간색', CL1004: '주황색', CL1005: '노란색', CL1006: '초록색',
  CL1007: '파란색', CL1008: '갈색', CL1009: '보라색', CL1011: '분홍색', CL1019: '회색', CL1023: '은색', CL1010: '' };
const CATEGORY_KO = { PRA000: '가방', PRO000: '귀금속', PRB000: '도서용품', PRC000: '서류', PRD000: '산업용품', PRQ000: '쇼핑백',
  PRE000: '스포츠용품', PRR000: '악기', PRM000: '유가증권', PRK000: '의류', PRF000: '자동차', PRG000: '전자기기',
  PRH000: '지갑', PRN000: '증명서', PRI000: '컴퓨터', PRP000: '카드', PRL000: '현금', PRJ000: '휴대폰', PRZ000: '기타물품' };
const MAX_MATCH_CANDIDATES = 60;

// 경찰청 물품 분류 코드 (src/parts/features/lost-found.html 과 같은 목록)
const LOST_CATEGORIES = {
  PRA000: 'Bag, backpack, handbag, pouch', PRH000: 'Wallet, purse', PRJ000: 'Mobile phone',
  PRG000: 'Electronics: camera, earphones, tablet, watch, charger', PRI000: 'Laptop computer',
  PRN000: 'ID card, passport, driver license', PRP000: 'Credit or transport card', PRL000: 'Cash',
  PRO000: 'Jewelry, ring, necklace', PRK000: 'Clothing, hat, shoes', PRC000: 'Documents',
  PRB000: 'Books, stationery', PRQ000: 'Shopping bag', PRE000: 'Sports equipment',
  PRR000: 'Musical instrument', PRM000: 'Securities, vouchers', PRF000: 'Car parts, car keys',
  PRD000: 'Industrial goods', PRZ000: 'Other items'
};

const LOST_QUESTIONS = {
  category: {
    type: 'choice',
    instructions: 'This is a lost item report from a tourist in Jeju. Which police lost-item category fits the lost item best?',
    criteria: LOST_CATEGORIES
  },
  is_real: {
    type: 'noul',
    instructions: 'Is this a genuine lost item report (not a test entry, spam, or empty form)?'
  },
  has_id: {
    type: 'noul',
    instructions: 'Does the lost item include a passport, ID card, or other identity document?'
  },
  region: {
    type: 'choice',
    instructions: 'In which Korean city or province was the item most likely lost? Use the place where the owner last had it.',
    criteria: regionCriteria({})
  },
  place_type: {
    type: 'choice',
    instructions: 'What kind of place was the item lost in?',
    criteria: PLACE_TYPES
  },
  color: {
    type: 'choice',
    instructions: 'What is the main color of the lost item?',
    criteria: COLORS
  },
  region_alt: {
    type: 'choice',
    instructions: 'If the item was lost on a bus, train, taxi or plane, which city or province is the other end of that trip (where a found item would be handed in)? Choose same if there is no second place.',
    criteria: regionCriteria({ same: 'No second place / same as where it was lost' })
  }
};

const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');

/** 시트 값 중 YYYY-MM-DD 모양을 분실일로 본다 (열이 밀린 옛 행도 있어서 이름 대신 값으로 찾음) */
function findLostDate(fields) {
  for (const [h, v] of Object.entries(fields)) {
    if (h === 'Timestamp') continue;
    const m = String(v).match(/(20\d{2})-(\d{2})-(\d{2})/);
    if (m) return new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00+09:00`);
  }
  const ts = String(fields.Timestamp || '').match(/(20\d{2})\.\s*(\d{1,2})\.\s*(\d{1,2})/);
  // 날짜 칸이 비어 있으면 자동번역 문장 속 'N월 N일' (연도는 접수일 기준, 접수일보다 뒤면 작년)
  const ko = String(fields['분실내용(자동번역)'] || fields.Desc_ko || '').match(/(\d{1,2})월\s*(\d{1,2})일/);
  if (ko && ts) {
    let y = parseInt(ts[1], 10);
    const d = new Date(`${y}-${ko[1].padStart(2, '0')}-${ko[2].padStart(2, '0')}T00:00:00+09:00`);
    const sub = new Date(`${ts[1]}-${ts[2].padStart(2, '0')}-${ts[3].padStart(2, '0')}T00:00:00+09:00`);
    if (!isNaN(d) && d <= sub) return d;
    if (!isNaN(d)) return new Date(`${--y}-${ko[1].padStart(2, '0')}-${ko[2].padStart(2, '0')}T00:00:00+09:00`);
  }
  if (ts) return new Date(`${ts[1]}-${ts[2].padStart(2, '0')}-${ts[3].padStart(2, '0')}T00:00:00+09:00`);
  return new Date();
}

async function searchFound(env, categoryCd, regionCodes, from, to) {
  let key = String(env.PUBLIC_DATA_KEY || '').trim();
  if (!key) throw new Error('PUBLIC_DATA_KEY is not set');
  if (!key.includes('%')) key = encodeURIComponent(key);

  const requests = regionCodes.flatMap(cd => FOUND_ENDPOINTS.map(ep => `${ep}?serviceKey=${key}&numOfRows=500&pageNo=1` +
    `&N_FD_LCT_CD=${cd}&START_YMD=${ymd(from)}&END_YMD=${ymd(to)}&PRDT_CL_CD_01=${categoryCd}`));
  const lists = await Promise.all(requests.map(async (reqUrl) => {
    const res = await fetch(reqUrl);
    if (!res.ok) return [];
    const text = await res.text();
    // 응답이 JSON/XML로 흔들려서 XML 태그를 직접 읽는다 (JSON이면 item 배열로)
    if (text.trim().startsWith('{')) {
      const j = JSON.parse(text);
      const raw = j.response?.body?.items?.item || j.response?.body?.items || [];
      return Array.isArray(raw) ? raw : [raw];
    }
    return [...text.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, body]) => {
      const tag = (t) => (body.match(new RegExp(`<${t}>([\\s\\S]*?)</${t}>`)) || [])[1] || '';
      return { atcId: tag('atcId'), fdPrdtNm: tag('fdPrdtNm'), depPlace: tag('depPlace'), fdYmd: tag('fdYmd'), prdtClNm: tag('prdtClNm'), fdSbjt: tag('fdSbjt'), fdFilePathImg: tag('fdFilePathImg') };
    });
  }));
  const seen = new Set();
  return lists.flat().filter(i => i && i.atcId && !seen.has(i.atcId) && seen.add(i.atcId));
}

// ─── 고객용 유력 후보 페이지 (jeju-live.com/m/?t=…) ───
// 큐 '후보JSON' 칸에 습득물 후보를 쌓고, 링크 토큰은 큐 행 번호를 TASK_SECRET으로 서명한 값 (시트에 따로 저장 안 함)
const MATCH_INSTRUCTIONS = 'Which found item (if any) is most likely the same object as this lost item?';
// 여권·신분증은 경찰 습득물 목록에 소유자 이름(영문·한글 음역)이 함께 적히는 경우가 많다
function enNameHint(en) {
  return en ? ` The lost item contains a passport or ID belonging to "${en}". A found item whose name or description contains this name (or its Korean transliteration, e.g. ZHANG SAN → 장산) is a very strong match; a passport/ID with a clearly different name is not a match.` : '';
}
const CANDIDATE_MIN_P = 0.1;      // 이보다 낮은 일치 확률은 페이지에 올리지 않는다
const CANDIDATE_MAX = 8;
function candidateOf(c, p, src) {
  const img = String(c.fdFilePathImg || '');
  return {
    id: c.atcId, name: c.fdPrdtNm || '', place: c.depPlace || '', date: c.fdYmd || '',
    img: /^https?:\/\//.test(img) && !/no_?img/i.test(img) ? img : '',
    p: Math.round(Number(p) * 100) / 100, src,
    at: new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
  };
}
function mergeCandidates(prevJson, fresh) {
  let prev = [];
  try { prev = JSON.parse(prevJson || '[]'); } catch { prev = []; }
  const byId = new Map(prev.map(c => [c.id, c]));
  fresh.forEach(c => { if (!byId.has(c.id) || byId.get(c.id).p < c.p) byId.set(c.id, { ...(byId.get(c.id) || {}), ...c }); });
  return JSON.stringify([...byId.values()].sort((a, b) => b.p - a.p).slice(0, CANDIDATE_MAX));
}
async function matchToken(env, queueRow) {
  return `${queueRow}-${(await signTicket(env, `match.${queueRow}`)).slice(0, 24)}`;
}
const PAID_STATUSES = ['등록대기', '등록필요', '완료'];
/** GET /match?t= — 인증 없이 토큰만으로. 연락처·분실자 설명은 내보내지 않는다 (결제 전이면 후보 건수만) */
async function publicMatch(env, token) {
  const m = String(token || '').match(/^(\d+)-([0-9a-f]{24})$/);
  if (!m || await matchToken(env, Number(m[1])) !== token) return Response.json({ error: 'invalid' }, { status: 404 });
  const { row: q } = await callGas(env, { type: 'task_get', row: Number(m[1]) });
  if (!q || !/^LostReport!\d+$/.test(String(q['참고(링크·위챗ID 등)'] || ''))) return Response.json({ error: 'invalid' }, { status: 404 });
  let cands = [];
  try { cands = JSON.parse(q['후보JSON'] || '[]'); } catch { cands = []; }
  const status = String(q['상태'] || '').trim();
  const paid = PAID_STATUSES.includes(status);
  const done = String(q['처리일시'] || '').match(/^(\d{4}-\d{2}-\d{2}).*?(L\d{12,})/);
  let form = {};
  try { form = JSON.parse(q['신고서'] || '{}'); } catch { form = {}; }
  const watchUntil = done ? new Date(new Date(`${done[1]}T00:00:00+09:00`).getTime() + WATCH_DAYS * 86400000).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }) : '';
  return Response.json({
    code: `JL${String(q['참고(링크·위챗ID 등)']).replace('LostReport!', '')}`,
    status: status === '완료' ? 'registered' : paid ? 'paid' : 'unpaid',
    lostDate: form.lostYmd || '',
    category: String(q['Jev분류'] || '').split(' ')[0],
    police: done ? { date: done[1], sn: `${done[2].slice(0, -6)}*****${done[2].slice(-1)}` } : null,  // 공개 목록과 같이 맨 끝 앞 5자리 가림
    watchUntil,
    count: cands.length,
    candidates: paid ? cands : []
  });
}

async function notifyAdmin(env, title, body) {
  try {
    await fetch(env.NOTIFY_URL || DEFAULT_NOTIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body })
    });
  } catch (e) {
    console.warn('[notify] 실패 (주요 기능에 영향 없음):', e.message);
  }
}

async function processLost(env, row) {
  const { fields, ko = {}, photoIds = [] } = await callGas(env, { type: 'lost_get', row });
  const state = Object.entries(fields).map(([h, v]) => `${h}: ${v}`).join('\n');
  const answers = await askJev(env, state, LOST_QUESTIONS);
  const cat = answers.category || {};
  const isReal = Number(answers.is_real?.noul ?? 0);
  // 접수 양식에서 직접 체크한 값이 있으면 Jev 추측보다 우선
  const hasId = fields.HasIdCard === 'Y' ? 1 : Number(answers.has_id?.noul ?? 0);

  const lostDate = findLostDate(fields);
  const to = new Date(Math.min(Date.now(), lostDate.getTime() + SEARCH_DAYS_AFTER_LOSS * 86400000));
  // 확신이 낮으면 제주를 같이 본다 (이용자 대부분이 제주 여행 중)
  const regionKeys = [answers.region?.choice, answers.region_alt?.choice].filter(k => REGIONS[k]);
  if (!regionKeys.length || Number(answers.region?.confidence ?? 0) < MIN_CONFIDENCE) regionKeys.push('jeju');
  const regionNames = [...new Set(regionKeys)];
  const regionCodes = [...new Set(regionNames.flatMap(k => REGIONS[k].codes))];
  const found = cat.choice ? await searchFound(env, cat.choice, regionCodes, lostDate, to) : [];

  // 습득물 후보 중 같은 물건이 있는지 Jev에 한 번에 묻는다 (보기 = 습득물 + '없음')
  let match = null;
  const candidates = found.sort((a, b) => String(b.fdYmd).localeCompare(String(a.fdYmd))).slice(0, MAX_MATCH_CANDIDATES);
  if (candidates.length) {
    const criteria = { none: 'None of these found items is the lost item' };
    candidates.forEach(c => { criteria[c.atcId] = `${c.fdPrdtNm} | found ${c.fdYmd} | ${c.depPlace} | ${c.fdSbjt || ''}`.slice(0, 300); });
    const matchAnswers = await askJev(env, state, {
      match: { type: 'choice', instructions: MATCH_INSTRUCTIONS + enNameHint(fields.EnglishName), criteria }
    });
    match = matchAnswers.match || null;
  }

  const top = match?.probabilities
    ? Object.entries(match.probabilities).filter(([id]) => id !== 'none').sort((a, b) => b[1] - a[1]).slice(0, 3)
    : [];
  const byId = Object.fromEntries(candidates.map(c => [c.atcId, c]));
  const foundText = !candidates.length
    ? `습득물 후보 없음 (${ymd(lostDate)}~${ymd(to)} ${regionNames.join('+')}, ${cat.choice || '분류 실패'})`
    : `[${regionNames.join('+')}] 습득물 ${found.length}건 중 유력 후보: ` + top.map(([id, p]) => `${id} ${byId[id]?.fdPrdtNm || ''} @${byId[id]?.depPlace || ''} (${p.toFixed(2)})`).join(' / ') +
      ` | Jev 최종: ${match.choice} (${Number(match.confidence ?? 0).toFixed(2)})`;
  const candJson = mergeCandidates('[]', top.filter(([id, p]) => p >= CANDIDATE_MIN_P && byId[id])
    .map(([id, p]) => candidateOf(byId[id], p, 'initial')));

  // 찾기 서비스(9.9/19.9元) 결제가 확인된 건만 경찰 등록 대상 — 운영자가 LostReport '결제상태'를 '확인'으로 바꾸면 크론이 넘겨 줌
  const paid = String(fields['결제상태'] || '').trim() === '확인';
  const status = isReal < 0.5 ? '확인필요' : paid ? '등록대기' : '결제대기';
  const summary = String(fields['분실내용(자동번역)'] || fields.Desc_ko || state).replace(/\s+/g, ' ').slice(0, 80);
  // 관할 경찰서를 정하려면 구·군까지 필요 — 문장에 '이태원'만 있어도 용산구를 고르게 Jev에 따로 묻는다
  const formRegion = REGIONS[answers.region?.choice] ? answers.region.choice : 'jeju';
  const guList = GU_BY_REGION[formRegion] || [];
  if (guList.length > 1) {
    const guCriteria = Object.fromEntries(guList.map((g, i) => [`g${i}`, g]));
    guCriteria.unknown = 'Cannot tell which district';
    const guAns = (await askJev(env, `${state}\n${Object.values(ko).join('\n')}`, {
      gu: { type: 'choice', instructions: 'In which district (구/군/시) of this city or province was the item lost? Use neighborhood, landmark, station or bus stop names.', criteria: guCriteria }
    })).gu;
    if (guAns?.choice && guAns.choice !== 'unknown' && Number(guAns.confidence ?? 0) >= 0.5) answers.gu = guCriteria[guAns.choice];
  } else if (guList.length === 1) answers.gu = guList[0];
  const form = buildPoliceForm(row, fields, ko, answers, lostDate, photoIds);
  const formJson = JSON.stringify(form);
  const queued = await callGas(env, {
    type: 'task_append',
    fields: {
      '등록일': new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }),
      '요청내용': `[분실 #${row}] 경찰청 분실신고 등록 · ${summary}`,
      '참고(링크·위챗ID 등)': `LostReport!${row}`,
      '상태': status,
      'Jev분류': `${cat.choice || ''} ${LOST_CATEGORIES[cat.choice] || ''}`.trim(),
      'Jev모델': 'sonnet',
      'Jev확신도': `분류 ${Number(cat.confidence ?? 0).toFixed(2)} / 실제접수 ${isReal.toFixed(2)} / 신분증 ${hasId.toFixed(2)}`,
      'Jev승인필요': '1.00',
      '판정일시': new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
      '처리결과': foundText,
      '신고서': formJson,
      '후보JSON': candJson,
      '영문명': fields.EnglishName || ''
    }
  });

  // 같은 분실 건을 다시 돌리면 줄을 새로 만들지 않고 판정 칸만 갱신 (푸시도 다시 안 보냄)
  if (queued.existed) {
    await callGas(env, {
      type: 'task_update',
      row: queued.row,
      fields: { 'Jev분류': `${cat.choice || ''} ${LOST_CATEGORIES[cat.choice] || ''}`.trim(), '판정일시': new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }), '처리결과': foundText, '신고서': formJson, '후보JSON': candJson }
    });
  } else {
    const urgent = hasId >= 0.5 ? '🚨 신분증 포함 · ' : '';
    const hit = match && match.choice !== 'none' ? `습득물 유력 후보 ${match.choice}` : `습득물 후보 ${found.length}건`;
    await notifyAdmin(env, `🔎 분실 접수 #${row}`, `${urgent}${hit} · ${status === '등록대기' ? '경찰청 등록 대기' : status}`);
  }
  return { row, queueRow: queued.row, existed: !!queued.existed, status, category: cat.choice, regions: regionNames, found: found.length, match: match?.choice || null, foundText, form };
}

/**
 * minwon24 분실물 신고서에 넣을 값 (fill 스크립트가 필드 ID 그대로 채운다)
 * 문장은 GAS 자동번역(한국어) 칸, 장소는 GAS가 번역해 준 ko.* 를 쓴다 — 분실자 이름·위챗ID는 넣지 않음
 * minwon24는 한자를 ?로 저장해 버리므로 남은 한자는 지운다.
 */
function buildPoliceForm(row, fields, ko, answers, lostDate, photoIds) {
  const noHan = (s) => String(s || '').replace(/[㐀-鿿豈-﫿]+/g, ' ').replace(/[ \t]+/g, ' ').trim();
  const cat = answers.category?.choice || 'PRZ000';
  const place = answers.place_type?.choice || 'LL1017';
  const color = COLOR_BY_NAME[fields.ItemColor] || answers.color?.choice || 'CL1010';
  const region = REGIONS[answers.region?.choice] ? answers.region.choice : 'jeju';
  const koText = String(fields['분실내용(자동번역)'] || fields.Desc_ko || '')
    .replace(/^[A-Z][a-z]{2} [A-Z][a-z]{2} \d{1,2} \d{4} [\d:]+ GMT[^)]*\)\s*/, '')   // 앞에 붙은 날짜 문자열
    .replace(/^\d{4}년 \d{1,2}월 \d{1,2}일 [^)]*\)\s*/, '')
    .trim();
  const time = String(fields.Time || fields.RegionCategory || '').match(/^(\d{1,2}):\d{2}/) || koText.match(/(\d{1,2})\s*(?:시|:\d{2})/);
  const pk = (h) => noHan(ko[h] || fields[h]);
  const route = fields.BoardLoc && fields.AlightLoc ? `${pk('BoardLoc')} → ${pk('AlightLoc')} ` : '';
  const where = pk('DetailLocation') || pk('HotelName') || pk('City');
  const itemKo = `${COLOR_KO[color]} ${CATEGORY_KO[cat]}`.trim();
  return {
    lostRow: row,
    sido: SIDO_PREFIX[region],
    gu: answers.gu || '',
    rgnCd: REGIONS[region].codes[0],
    lostPlcNm: `${`${route}${where}`.replace(/\s+/g, ' ').trim().slice(0, 50)} (${PLACE_KO[place]})`,
    lostPlcSeCd: place,
    lostYmd: lostDate.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }),
    hour: String(time ? Math.min(23, parseInt(time[1], 10)) : 12).padStart(2, '0'),
    lclsf: cat,
    color,
    qty: 1,
    itemName: itemKo.replace(/\d{4,}/g, ''),
    title: `${PLACE_KO[place] === '기타' ? '' : PLACE_KO[place] + ' '}${CATEGORY_KO[cat]} 분실`.trim(),
    // 신청인(운영자) 연락처로 경찰 연락이 오므로 대리 신고라는 것만 짧게 남긴다
    content: noHan(`${koText}${fields.HasIdCard === 'Y' ? '\n※ 안에 여권·신분증·카드가 들어 있음' : ''}\n\n(외국인 관광객 분실물 대리 신고)`).slice(0, 1900),
    guText: `${koText} ${where} ${pk('AlightLoc')} ${pk('City')}`,
    photoIds
  };
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil((async () => {
      console.log('[triage]', JSON.stringify(await triage(env)));
      // 하루 한 번(KST 09:00~09:14)은 결제 건 10일 감시만 — Workers 무료 요청 한도(50) 때문에 다른 일과 나눔
      const kst = new Date(event.scheduledTime + 9 * 3600000);
      if (kst.getUTCHours() === 9 && kst.getUTCMinutes() < 15) {
        console.log('[watch]', JSON.stringify(await watchPaidLost(env)));
      } else {
        console.log('[paid]', JSON.stringify(await promotePaid(env)));
        console.log('[lost]', JSON.stringify(await triageLost(env)));
      }
    })());
  },

  // 모든 경로 TASK_SECRET 헤더 필요. minwon24 페이지(북마클릿)에서 부르므로 CORS 허용
  //   GET  /run?lost_row=612        → LostReport 그 한 줄 판정
  //   GET  /run?lost_pending=1      → 크론과 같은 새 분실 접수 판정 (최대 3건)
  //   GET  /run?paid=1 · ?watch=1   → 결제 확인 건 등록대기로 · 결제 건 10일 습득물 감시 (크론과 같음)
  //   GET  /run?lost_row=612&peek=1 → 원본만
  //   POST /run {queueRow|lostRow, fields} → 작업 큐 / 운영 시트 기록
  //   GET  /form[?lost_row=612]     → 신고서 값 (없으면 '등록대기' 분실 건 중 첫 번째)
  //   GET  /photo?id=드라이브ID      → 사진 바이너리 (신고서 첨부용)
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = {
      'Access-Control-Allow-Origin': 'https://minwon24.police.go.kr',
      'Access-Control-Allow-Headers': 'x-task-secret, x-task-ticket, content-type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    // 채우기 스크립트 자체는 비밀이 아니라 인증 없이 (값·사진은 /form·/photo 에서 인증 후)
    if (url.pathname === '/fill.js') {
      // 번들러(esbuild keepNames)가 함수 안에 __name(...) 을 끼워 넣으므로 브라우저 쪽에 같은 이름의 빈 헬퍼를 둔다
      return new Response(`var __name = __name || ((f) => f);\nwindow.jejuFill = ${jejuFill.toString()};\nwindow.jejuSubmit = ${jejuSubmit.toString()};\nwindow.jejuRecord = ${jejuRecord.toString()};\n`, {
        headers: { ...cors, 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-store' }
      });
    }
    // 고객 후보 페이지 데이터 — 비밀값 대신 서명 토큰 (jeju-live.com/api/lost-match 가 받아 캐시)
    if (url.pathname === '/match' && request.method === 'GET') {
      try { return await publicMatch(env, url.searchParams.get('t')); } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
    }
    if (!['/run', '/form', '/photo'].includes(url.pathname)) return new Response('ok');
    let res;
    const ticket = await checkTicket(env, request.headers.get('x-task-ticket'));
    if (ticket) {
      // 신고서 한 건 전용 30분 표 — 그 건의 사진과 접수 기록만 (Claude 자동 등록이 비밀값을 화면 코드에 넣지 않도록)
      res = await routeTicket(request, env, url, ticket);
    } else if (String(request.headers.get('x-task-secret') || '').trim() !== String(env.TASK_SECRET || '').trim()) {
      return new Response('forbidden', { status: 403, headers: cors });
    } else {
      res = await route(request, env, url);
    }
    Object.entries(cors).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }
};

// ─── 신고서 한 건 전용 표 (queueRow.lostRow.만료ms.서명) ───
const TICKET_MS = 30 * 60000;
async function signTicket(env, payload) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(env.TASK_SECRET)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload)));
  return [...sig.slice(0, 16)].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function makeTicket(env, queueRow, lostRow) {
  const payload = `${queueRow}.${lostRow}.${Date.now() + TICKET_MS}`;
  return `${payload}.${await signTicket(env, payload)}`;
}
async function checkTicket(env, raw) {
  const m = String(raw || '').match(/^(\d+)\.(\d+)\.(\d+)\.([0-9a-f]{32})$/);
  if (!m || Number(m[3]) < Date.now()) return null;
  if (await signTicket(env, `${m[1]}.${m[2]}.${m[3]}`) !== m[4]) return null;
  return { queueRow: Number(m[1]), lostRow: Number(m[2]) };
}
async function routeTicket(request, env, url, t) {
  if (url.pathname === '/photo' && request.method === 'GET') return route(request, env, url);
  if (url.pathname === '/run' && request.method === 'POST') {
    const body = await request.clone().json();
    if ((body.queueRow && body.queueRow !== t.queueRow) || (body.lostRow && body.lostRow !== t.lostRow)) {
      return Response.json({ error: 'ticket mismatch' }, { status: 403 });
    }
    return route(request, env, url);
  }
  return Response.json({ error: 'not allowed with ticket' }, { status: 403 });
}

async function route(request, env, url) {
  try {
    if (url.pathname === '/form') return Response.json(await nextForm(env, parseInt(url.searchParams.get('lost_row'), 10)));
    if (url.pathname === '/photo') {
      const id = String(url.searchParams.get('id') || '');
      if (!/^[-\w]{10,100}$/.test(id)) return Response.json({ error: 'bad id' }, { status: 400 });
      const gasUrl = new URL(String(env.TASK_GAS_URL).trim());
      gasUrl.searchParams.set('action', 'image');
      gasUrl.searchParams.set('id', id);
      const img = await (await fetch(gasUrl)).json();
      if (img.error) return Response.json(img, { status: 404 });
      const bytes = Uint8Array.from(atob(img.data), c => c.charCodeAt(0));
      return new Response(bytes, { headers: { 'Content-Type': img.mime || 'image/jpeg' } });
    }
    {
      // POST /run { queueRow, fields } → 작업 큐 한 줄 갱신 (경찰 접수번호 기록 등, Claude가 처리 후 호출)
      if (request.method === 'POST') {
        const body = await request.json();
        // { lostRow, fields } → 운영 시트 LostReport (경찰접수번호 등 허용된 칸만, GAS에서 막음)
        if (body.lostRow) return Response.json(await callGas(env, { type: 'lost_update', row: body.lostRow, fields: body.fields }));
        return Response.json(await callGas(env, { type: 'task_update', row: body.queueRow, fields: body.fields }));
      }
      const lostRow = parseInt(url.searchParams.get('lost_row'), 10);
      // peek=1 → 판정 없이 원본 내용만 (경찰청 신고서 작성용, 연락처 칸은 GAS에서 이미 빠짐)
      if (lostRow >= 2 && url.searchParams.get('peek')) return Response.json(await callGas(env, { type: 'lost_get', row: lostRow }));
      // contact=1 → 고객 위챗 ID (경찰 접수 안내 발송용, 비밀값 필요 — 표로는 못 씀)
      if (lostRow >= 2 && url.searchParams.get('contact')) return Response.json(await callGas(env, { type: 'lost_contact', row: lostRow }));
      if (lostRow >= 2) return Response.json(await processLost(env, lostRow));
      if (url.searchParams.get('lost_pending')) return Response.json(await triageLost(env));
      if (url.searchParams.get('watch')) return Response.json(await watchPaidLost(env));
      if (url.searchParams.get('paid')) return Response.json(await promotePaid(env));
      return Response.json(await triage(env));
    }
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

/**
 * 새 분실 접수(아직 큐에 없는 LostReport 행)를 판정해 큐에 올린다 — 크론마다 최대 3건
 * (한 건에 GAS·Jev·습득물 API 호출이 10여 개라 Workers 무료 요청 한도(50) 안에 맞춤)
 */
/** '결제대기' 큐 건 중 LostReport 결제상태가 '확인'이 된 것을 '등록대기'로 올린다 (관리자 결제 버튼은 GAS가 바로 올림)
 *  최근 건부터 6건까지 확인 — 예전엔 앞 5건만 봐서 결제 안 한 옛 건에 막혀 뒤 건이 영영 안 올라갔음
 *  (lost_get 이 번역까지 해서 12건이면 GAS 응답이 100초를 넘김 → 524) */
async function promotePaid(env) {
  const { rows } = await callGas(env, { type: 'task_list', status: '결제대기' });
  const out = [];
  for (const q of rows.slice().reverse().slice(0, 6)) {
    const n = parseInt(String(q['참고(링크·위챗ID 등)'] || '').replace('LostReport!', ''), 10);
    if (!(n >= 2)) continue;
    const { fields } = await callGas(env, { type: 'lost_get', row: n });
    if (String(fields['결제상태'] || '').trim() !== '확인') continue;
    await callGas(env, { type: 'task_update', row: q.row, fields: { '상태': '등록대기' } });
    await notifyAdmin(env, `💳 결제 확인 #${n}`, `${fields['찾기상품'] || ''} · 경찰청 등록 가능`);
    out.push(n);
  }
  return out;
}

/**
 * 경찰 등록을 마친 결제 건(큐 '완료')을 등록일부터 10일간 하루 한 번 습득물과 다시 대조
 * 새 후보가 Jev 일치 확률 0.5 이상이면 관리자 푸시 (위챗 안내는 운영자가). 이미 알린 습득물은 '감시알림' 칸에 쌓아 중복 방지.
 */
const WATCH_DAYS = 10;
async function watchPaidLost(env) {
  const { rows } = await callGas(env, { type: 'task_list', status: '완료' });
  const now = Date.now();
  const out = [];
  for (const q of rows) {
    if (out.length >= 5) break;
    const ref = String(q['참고(링크·위챗ID 등)'] || '');
    const done = String(q['처리일시'] || '').match(/^(\d{4}-\d{2}-\d{2})/);
    if (!/^LostReport!\d+$/.test(ref) || !done || !q['신고서']) continue;
    if (now - new Date(`${done[1]}T00:00:00+09:00`).getTime() > WATCH_DAYS * 86400000) continue;
    const form = JSON.parse(q['신고서']);
    const notified = String(q['감시알림'] || '').split(/\s+/).filter(Boolean);
    try {
      const found = (await searchFound(env, form.lclsf, [form.rgnCd], new Date(`${form.lostYmd}T00:00:00+09:00`), new Date()))
        .filter(c => !notified.includes(c.atcId))
        .sort((a, b) => String(b.fdYmd).localeCompare(String(a.fdYmd))).slice(0, MAX_MATCH_CANDIDATES);
      if (!found.length) { out.push({ ref, fresh: 0 }); continue; }
      const criteria = { none: 'None of these found items is the lost item' };
      found.forEach(c => { criteria[c.atcId] = `${c.fdPrdtNm} | found ${c.fdYmd} | ${c.depPlace} | ${c.fdSbjt || ''}`.slice(0, 300); });
      const en = String(q['영문명'] || '').trim();
      const m = (await askJev(env, `${form.itemName}\n${form.lostPlcNm}\n${form.content}${en ? `\nOwner name on passport/ID: ${en}` : ''}`, {
        match: { type: 'choice', instructions: MATCH_INSTRUCTIONS + enNameHint(en), criteria }
      })).match;
      const p = Number(m?.probabilities?.[m?.choice] ?? 0);
      if (m?.choice && m.choice !== 'none' && p >= 0.5) {
        const c = found.find(f => f.atcId === m.choice);
        await notifyAdmin(env, `🎯 습득물 후보 (${ref})`, `${c.fdPrdtNm} @${c.depPlace} ${c.fdYmd} (${p.toFixed(2)}) · ${m.choice}`);
        // 고객 후보 페이지에도 같이 올린다 (같은 링크를 다시 열면 새 후보가 보임)
        await callGas(env, { type: 'task_update', row: q.row, fields: { '감시알림': [...notified, m.choice].join(' '), '후보JSON': mergeCandidates(q['후보JSON'], [candidateOf(c, p, 'watch')]) } });
      }
      out.push({ ref, fresh: found.length, match: m?.choice, p });
    } catch (e) {
      out.push({ ref, error: e.message });
    }
  }
  return out;
}

async function triageLost(env) {
  const { rows } = await callGas(env, { type: 'lost_pending', limit: 3 });
  const results = [];
  for (const row of rows) {
    try {
      const r = await processLost(env, row);
      results.push({ row, queueRow: r.queueRow, status: r.status, category: r.category, regions: r.regions });
    } catch (e) {
      console.error('[lost] row', row, e.message);
      results.push({ row, error: e.message });
    }
  }
  return results;
}

/** 큐에서 경찰 등록 대기 분실 건의 신고서 값을 꺼낸다 (lostRow를 주면 그 건)
 *  상태 '등록대기'(관리자 결제 버튼·크론이 씀)와 예전 이름 '등록필요' 둘 다 */
const READY_STATUSES = ['등록대기', '등록필요'];
async function nextForm(env, lostRow) {
  const rows = (await Promise.all(READY_STATUSES.map(status => callGas(env, { type: 'task_list', status }))))
    .flatMap(r => r.rows || []);
  const lost = rows.filter(r => /^LostReport!\d+$/.test(r['참고(링크·위챗ID 등)'] || '') && r['신고서']);
  const pick = lostRow >= 2 ? lost.find(r => r['참고(링크·위챗ID 등)'] === `LostReport!${lostRow}`) : lost[0];
  if (!pick) return { error: lostRow ? `LostReport ${lostRow}: 등록대기 상태의 신고서 없음 (판정을 먼저 돌릴 것)` : '대기 중인 분실 신고 없음' };
  const form = JSON.parse(pick['신고서']);
  return { queueRow: pick.row, form, summary: pick['요청내용'], found: pick['처리결과'], ticket: await makeTicket(env, pick.row, form.lostRow) };
}
