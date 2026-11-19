// 추천 코스 장소마다 가까운 식당을 미리 골라 src/data/course-eats.js로 만든다.
// 코스 화면은 이 작은 파일만 불러오므로 맛집 전체 데이터(약 300KB)를 내려받지 않는다.
//
// 입력: src/data/eats.js(맛집) · tools/eats_geo.json(주소 좌표, geocode_eats.js) · src/data/courses.js(STOP_POS)
// 실행: node tools/geocode_eats.js && node tools/build_course_eats.mjs
// 맛집·코스 장소가 바뀌면 다시 실행할 것.
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const imp = (p) => import(pathToFileURL(path.join(ROOT, p)).href);
const { EATS } = await imp('src/data/eats.js');
const { STOP_POS } = await imp('src/data/courses.js');
const { roadKm } = await imp('src/data/taxi.js');
const GEO = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'eats_geo.json'), 'utf8'));

const NEAR_KM = 4;   // 이 안의 식당을 우선
const FAR_KM = 10;   // 가까운 곳이 모자라면 여기까지 넓힌다
const PICK = 4; // 화면엔 3곳. 점심·저녁이 겹치면 다음 후보로 채운다

// eats.js의 추천 점수와 같은 식 (평점을 리뷰 수로 보정 + 공식 지정·도민·20·30대 인기 가산)
function recScore(d) {
    const conf = Math.min(1, Math.log10((d.gr || 0) + 1) / 3);
    let s = (d.g || 3.5) * conf + 3.5 * (1 - conf);
    const t = d.t || [];
    if (t.includes('hyangto')) s += 0.15;
    if (t.includes('locals')) s += 0.15;
    if (t.includes('cnreview')) s += 0.1;
    if (t.includes('cnmenu')) s += 0.1;
    if (t.includes('hot')) s += 0.1;
    if (t.includes('booking')) s -= 0.2; // 코스 중간에 들르기엔 예약제가 불편하다
    if (d.cu[0] === 'snack') s -= 0.2; // 빵·분식은 한 끼 식사 추천에서 뒤로
    return s + (d.pr || 0) * 0.02;
}

const isUdo = ([lat, lng]) => lat > 33.48 && lng > 126.93;
const HIGHLIGHT = ['tv', 'hot', 'hyangto', 'locals', 'century', 'goodprice'];

const foods = EATS.filter(d => d.c === 'food' && GEO[d.a]).map(d => ({ d, ll: GEO[d.a], score: recScore(d) }));
const list = [];
const indexOf = new Map();
const STOP_EATS = {};

for (const [name, pos] of Object.entries(STOP_POS)) {
    const udo = isUdo(pos);
    const cand = foods.filter(f => isUdo(f.ll) === udo) // 우도 안팎은 배를 타야 하므로 섞지 않는다
        .map(f => ({ ...f, km: roadKm(pos, f.ll) }))
        .filter(f => f.km <= FAR_KM);
    // 가까운 곳 먼저, 그 안에서는 점수순. 1km 늘 때마다 점수 0.12 감점
    const near = cand.filter(f => f.km <= NEAR_KM);
    const pool = near.length >= PICK ? near : cand;
    const picks = pool.sort((a, b) => (b.score - b.km * 0.12) - (a.score - a.km * 0.12)).slice(0, PICK);
    if (!picks.length) continue;
    STOP_EATS[name] = picks.map(f => {
        if (!indexOf.has(f.d.id)) {
            const d = f.d;
            const r = { n: d.n, cu: d.cu[0], g: d.g || undefined, gr: d.gr || undefined, p: d.p, mn: d.mn || undefined,
                hl: HIGHLIGHT.find(k => (d.t || []).includes(k)), ln: d.ln || d.lk, a: d.a.replace(/^제주특별자치도\s*/, '') };
            for (const k of Object.keys(r)) if (r[k] === undefined) delete r[k];
            indexOf.set(d.id, list.length);
            list.push(r);
        }
        return [indexOf.get(f.d.id), Math.round(f.km * 10) / 10];
    });
}

const out = `// 자동 생성 파일 — 직접 고치지 말 것. tools/build_course_eats.mjs 로 다시 만든다. (${new Date().toISOString().slice(0, 10)})
// 코스 장소(STOP_POS) 근처 식당. MEAL_EATS: n 이름 · cu 음식종류 · g 구글평점 · gr 리뷰 수 · p [1인 최소,최대]원 · mn 대표메뉴
//   · hl 대표 키워드 · ln 지도 링크 · a 주소.  STOP_EATS: 장소 이름 → [[MEAL_EATS 번호, 도로 거리 km], ...] (추천순)
export const MEAL_EATS = ${JSON.stringify(list)};
export const STOP_EATS = ${JSON.stringify(STOP_EATS)};
`;
fs.writeFileSync(path.join(ROOT, 'src', 'data', 'course-eats.js'), out);
const missing = Object.keys(STOP_POS).filter(k => !STOP_EATS[k]);
console.log('장소', Object.keys(STOP_POS).length, '연결', Object.keys(STOP_EATS).length, '식당', list.length, 'bytes', Buffer.byteLength(out), missing.length ? '근처 식당 없음: ' + missing.join(', ') : '');
