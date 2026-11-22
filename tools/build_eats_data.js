// 맛집(BETA) 데이터 생성: '제주 후보지 선별' 아티팩트 HTML의 DATA 배열 → src/data/eats.js
// 사용: node tools/build_eats_data.js <아티팩트.html>
// 식당·카페만 넣고(관광지·체험 제외), 폐업은 뺀다. 화면에 필요한 필드만 짧은 키로 줄인다.
const fs = require('fs');
const path = require('path');

const src = process.argv[2];
if (!src) { console.error('usage: node tools/build_eats_data.js <artifact.html>'); process.exit(1); }
const html = fs.readFileSync(src, 'utf8');
const i = html.indexOf('const DATA = ');
const j = html.indexOf('];', i);
const DATA = JSON.parse(html.slice(i + 13, j + 1));
// 방송·20·30대 인기 보강분(구글맵 검증 완료)은 뒤에 붙여 기존 id 순서를 유지한다
const { TREND, EXTRA_TAGS } = require('./eats_trend.js');
const GEO = JSON.parse(fs.readFileSync(path.join(__dirname, 'eats_geo.json'), 'utf8')); // 주소 → [위도, 경도] (tools/geocode_eats.js)
const CATCHTABLE = JSON.parse(fs.readFileSync(path.join(__dirname, 'eats_catchtable.json'), 'utf8'));
DATA.push(...TREND);
// 가게별 덧붙임(한 줄 추천평 rv{zh,en,ko}, 매장 공식 사진 img·imgBy) — 이름으로 찾는다
const EXTRA_PATH = path.join(__dirname, 'eats_extra.json');
const EXTRA = fs.existsSync(EXTRA_PATH) ? JSON.parse(fs.readFileSync(EXTRA_PATH, 'utf8')) : {};
// 단골식당: 제주 현지 지인들의 카카오맵 단골 목록과 겹치는 가게 (tools/eats_regular.json)
const REGULAR = new Set(JSON.parse(fs.readFileSync(path.join(__dirname, 'eats_regular.json'), 'utf8')).inEats);

// 주소 → 세부 지역 키
function area(addr) {
    const a = addr || '';
    const m = a.match(/(제주시|서귀포시)\s+(\S+?[읍면])(\s|$)/);
    if (m) {
        const map = { 애월읍: 'aewol', 한림읍: 'hallim', 한경면: 'hallim', 조천읍: 'jocheon', 구좌읍: 'gujwa', 우도면: 'udo', 추자면: 'jeju',
            성산읍: 'seongsan', 표선면: 'pyoseon', 남원읍: 'pyoseon', 대정읍: 'daejeong', 안덕면: 'daejeong' };
        return map[m[2]] || 'jeju';
    }
    if (/서귀포시/.test(a)) return /(중문|색달|대포|하원|회수|도순|월평|강정|상예|하예|천제연)/.test(a) ? 'jungmun' : 'seogwipo';
    return 'jeju';
}

// 음식 종류 키 (여러 개 가능). 세부유형 + 대표메뉴 + 이름으로 판단
const CUISINE = [
    ['pork', /흑돼지|돼지|삼겹|오겹|두루치기|근고기|가브리|주물럭|백돼지|돔베/],
    ['seafood', /해산물|회|스시|초밥|갈치|고등어|우럭|전복|성게|보말|물회|자리|옥돔|해녀|게장|문어|딱새우|소라|각재기|멜|객주리|삼치|복어|복요리|복지리|오분작|깅이|어죽|생선|다금바리|해물|조개|한치|쥐치/],
    ['noodle', /국수|칼국수|짬뽕|짜장|냉면|밀면|메밀|라면|우동/],
    ['soup', /국밥|해장국|순대|곰탕|몸국|탕|국$|국·|죽|삼계탕|순두부|찌개|접짝|뚝배기|전골|샤브/],
    ['meat', /갈비|말고기|말코기|흑우|한우|닭|치킨|통닭|족발|보쌈|고기구이|생고기/],
    ['snack', /빵|떡|분식|떡볶이|모닥치기|빙떡|김밥|버거|카스테라|베이커리|도넛|꽈배기|만두|바게트/],
    ['western', /양식|코스|카레|커틀렛|파스타|피자/],
];
function cuisines(d) {
    if (d.분류 === '카페') return ['cafe'];
    const s = [d.세부유형, d.대표메뉴, d.이름_ko].join(' ');
    const out = CUISINE.filter(([, re]) => re.test(s)).map(([k]) => k);
    if (!out.length && /향토/.test(d.세부유형)) out.push('local');
    return out.length ? out : ['other'];
}

// 1인 가격대 → [최소, 최대] (원)
function price(p) {
    if (!p) return null;
    const nums = (p.match(/[\d,]+/g) || []).map(s => parseInt(s.replace(/,/g, ''), 10)).filter(n => !isNaN(n));
    if (!nums.length) return null;
    const lo = nums[0] <= 1 ? 0 : nums[0];
    const hi = nums.length > 1 ? nums[1] : (/이상|\+/.test(p) ? 0 : lo);
    return [lo, hi];
}

// 대기시간 "없음~15분" / "30분~1시간" → 최대 분
function waitMax(w) {
    if (!w) return null;
    const parts = w.split('~');
    const last = parts[parts.length - 1];
    let m = 0;
    const h = last.match(/(\d+)\s*시간/); if (h) m += parseInt(h[1], 10) * 60;
    const mm = last.match(/(\d+)\s*분/); if (mm) m += parseInt(mm[1], 10);
    if (!h && !mm && /없음/.test(last)) m = 0;
    return m;
}

function link(d) {
    const naver = (d.출처링크 || '').split(' / ').find(u => /m\.place\.naver\.com/.test(u));
    return { ln: naver || '', lk: d.카카오링크 || '' };
}

const rows = [];
const seen = new Set();
for (const d of DATA) {
    if (d.분류 !== '식당' && d.분류 !== '카페') continue;
    if (/폐업/.test(d.영업상태 || '')) continue;
    const key = d.이름_ko + '|' + (d.주소_ko || '');
    if (seen.has(key)) continue;
    seen.add(key);

    const tags = [];
    const titles = (d.보유타이틀 || '') + ' ' + (d.선정근거 || '');
    if (d.규모 === 'local') tags.push('locals');
    if (REGULAR.has(d.이름_ko)) tags.push('regular');
    if (/향토음식점/.test(titles) || d.규모 === '향토지정') tags.push('hyangto');
    if (/착한가격/.test(titles) || d.규모 === '착한가격') tags.push('goodprice');
    if (/백년가게/.test(titles)) tags.push('century');
    const extra = EXTRA_TAGS[d.이름_ko] || '';
    const why = (d.선정근거 || '') + ' ' + extra;
    if (/수요미식회|맛있는녀석들|생활의 ?달인|백종원|전지적참견시점|백반기행|맛집의옆집|먹을텐데|또간집/.test(why)) tags.push('tv');
    if (/다이닝코드|또간집|먹을텐데/.test(why)) tags.push('hot');
    if (d.사진포인트 || /오션뷰/.test(d.세부유형 || '')) tags.push('photo');
    if (/오션뷰|바다|해변|해안/.test((d.세부유형 || '') + (d.사진포인트 || ''))) tags.push('ocean');
    if (d.중국어후기 === '있음') tags.push('cnreview');
    if (/중국어/.test(d.외국어메뉴 || '')) tags.push('cnmenu');
    if (/영어/.test(d.외국어메뉴 || '')) tags.push('enmenu');
    if (d['1인식사'] === '가능') tags.push('solo');
    if (d['1인식사'] === '2인부터') tags.push('twoplus');
    if (d.예약필요 === 'Y') tags.push('booking');
    if (d.외국인직접예약 === '가능') tags.push('walkin');
    const hm = (d.영업시간 || '').match(/(\d{1,2}):(\d{2})/);
    if (hm && parseInt(hm[1], 10) < 9) tags.push('breakfast');
    if (/노키즈/.test(d.우려사항 || '')) tags.push('nokids');

    const g = parseFloat(d.구글평점);
    const r = {
        id: rows.length,
        n: d.이름_ko,
        c: d.분류 === '카페' ? 'cafe' : 'food',
        cu: cuisines(d),
        s: d.세부유형 || '',
        mn: d.대표메뉴 || '',
        a: d.주소_ko || '',
        ar: area(d.주소_ko),
        p: price(d['1인가격대']),
        pt: d['1인가격대'] || '',
        g: isNaN(g) ? 0 : g,
        gr: parseInt(d.구글리뷰수, 10) || 0,
        nr: parseInt(d.네이버리뷰수, 10) || 0,
        w: waitMax(d.대기시간),
        h: d.영업시간 || '',
        off: d.정기휴무 || '',
        t: tags,
        why: [(d.선정근거 || '').replace(/\s*\/\s*트랙 [AB].*$/, ''), extra].filter(Boolean).join(' / '),
        ph: d.사진포인트 || '',
        cn: d.우려사항 && !/네이버에서 영업 여부/.test(d.우려사항) ? d.우려사항 : '',
        tel: d.연락처 || '',
        pr: parseInt(d.우선순위해당, 10) || 0,
        ...link(d),
        ll: GEO[d.주소_ko] || '', // 좌표 (일정 짜기 동선 계산용)
        ct: CATCHTABLE[d.이름_ko] || '', // 캐치테이블 글로벌 원격 줄서기·예약 (tools/eats_catchtable.json)
    };
    const ex = EXTRA[d.이름_ko];
    if (ex) { if (ex.rv) r.rv = ex.rv; if (ex.img) { r.img = ex.img; r.imgBy = ex.imgBy || ''; } }
    // 빈 값은 지워서 용량을 줄인다
    for (const k of Object.keys(r)) if (r[k] === '' || r[k] === null || (Array.isArray(r[k]) && !r[k].length)) delete r[k];
    rows.push(r);
}

// 단골식당 신규 가게: 지인 카카오맵 목록 중 기존 데이터에 없는 곳 (tools/fetch_regular_places.js로 업종·주소 확인, 검색 안 되는 곳=폐업은 제외)
{
    const REG = JSON.parse(fs.readFileSync(path.join(__dirname, 'eats_regular.json'), 'utf8'));
    const INFO = JSON.parse(fs.readFileSync(path.join(__dirname, 'eats_regular_info.json'), 'utf8'));
    const norm = s => (s || '').replace(/\s/g, '');
    const have = new Set(rows.map(r => norm(r.n)));
    const skip = new Set(REG.skip || []);
    const CAT_CU = [
        ['seafood', /해물|생선|초밥|참치|회/], ['noodle', /국수|냉면|라면|우동/], ['soup', /해장국|국밥|순대|찌개|전골|감자탕|설렁탕|곰탕/],
        ['meat', /육류|고기|치킨|정육/], ['snack', /분식|떡볶이|베이커리|제과|햄버거|샌드위치/], ['western', /양식|이탈리안|피자|멕시칸|퓨전/],
    ];
    let added = 0;
    for (const line of REG.places) {
        const [name0, , id] = line.split('|');
        const x = INFO[id];
        if (!x || !x.found || skip.has(name0) || have.has(norm(x.name)) || have.has(norm(name0))) continue;
        have.add(norm(x.name));
        const cats = (x.cat || '').split(' > ');
        const cafe = x.group === 'CE7' || cats[1] === '카페';
        let cu;
        if (cafe) cu = ['cafe'];
        else {
            const text = `${x.name} ${cats.slice(1).join(' ')}`;
            cu = CUISINE.filter(([, re]) => re.test(text)).map(([k]) => k);
            if (!cu.length) cu = CAT_CU.filter(([, re]) => re.test(cats.slice(1).join(' '))).map(([k]) => k);
            if (!cu.length) cu = ['other'];
        }
        const r = { id: rows.length, n: x.name, c: cafe ? 'cafe' : 'food', cu, s: cats.slice(1, 3).pop() || '', a: x.addr, ar: area(x.addr),
            t: ['regular'], tel: x.tel || '', lk: (x.url || '').replace(/^http:/, 'https:'), ll: x.ll };
        const ex = EXTRA[x.name];
        if (ex) { if (ex.rv) r.rv = ex.rv; if (ex.img) { r.img = ex.img; r.imgBy = ex.imgBy || ''; } }
        for (const k of Object.keys(r)) if (r[k] === '' || r[k] === null || (Array.isArray(r[k]) && !r[k].length)) delete r[k];
        rows.push(r);
        added++;
    }
    console.log('단골식당 신규', added);
}

// 지도 구역 키(z): 좌표가 어느 구역 폴리곤에 들어가는지 (tools/jeju_zones_rings.json, execution/build_jeju_zones.js)
// 해안선 단순화로 바다에 찍힌 가게는 가장 가까운 구역 경계로 붙인다
{
    const ZR = JSON.parse(fs.readFileSync(path.join(__dirname, 'jeju_zones_rings.json'), 'utf8'));
    const proj = ([lat, lng]) => [(lng - ZR.BBOX.minLng) * ZR.COS * ZR.SCALE, (ZR.BBOX.maxLat - lat) * ZR.SCALE];
    const inside = ([x, y], ring) => {
        let c = false;
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
            const [xi, yi] = ring[i], [xj, yj] = ring[j];
            if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
        }
        return c;
    };
    const segDist = ([px, py], [ax, ay], [bx, by]) => {
        const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy;
        const t = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len)) : 0;
        return Math.hypot(ax + t * dx - px, ay + t * dy - py);
    };
    const entries = Object.entries(ZR.zones);
    let near = 0;
    for (const r of rows) {
        if (!r.ll) continue;
        const pt = proj(r.ll);
        // 구멍(안쪽 고리)이 있는 구역도 있어 짝홀 규칙으로 센다
        let z = entries.find(([, rings]) => rings.filter(ring => inside(pt, ring)).length % 2 === 1)?.[0];
        if (!z) {
            let best = Infinity;
            for (const [k, rings] of entries) for (const ring of rings) for (let i = 1; i < ring.length; i++) {
                const d = segDist(pt, ring[i - 1], ring[i]);
                if (d < best) { best = d; z = k; }
            }
            near++;
        }
        r.z = z;
    }
    console.log('구역 바깥 → 가까운 구역', near);
}

const final = `// 자동 생성 파일 — 직접 고치지 말 것. tools/build_eats_data.js 로 다시 만든다.
// 출처: '제주 후보지 선별' 아티팩트 (식당·카페, 폐업 제외) + tools/eats_trend.js (방송·20·30대 인기, 구글맵 검증) + 단골식당(tools/eats_regular.json) · ${new Date().toISOString().slice(0, 10)}
// 키: n 이름 · c food|cafe · cu 음식종류 · s 세부유형 · mn 대표메뉴 · a 주소 · ar 세부지역 · p [1인 최소,최대]원 · pt 가격 원문
//     g 구글평점 · gr 구글리뷰 · nr 네이버리뷰 · w 최대대기(분) · h 영업시간 · off 정기휴무 · t 태그 · why 선정근거 · ph 사진포인트
//     cn 주의사항 · tel 연락처 · pr 우선순위 · ln 네이버 플레이스 · lk 카카오맵 · ct 캐치테이블 id · ll [위도, 경도] · z 지도 구역(jeju-zones.js)
export const EATS = ${JSON.stringify(rows)};
`;
fs.writeFileSync(path.join(__dirname, '..', 'src', 'data', 'eats.js'), final);
const stat = {};
rows.forEach(r => r.cu.forEach(c => { stat[c] = (stat[c] || 0) + 1; }));
console.log('rows', rows.length, 'bytes', Buffer.byteLength(final), JSON.stringify(stat));
