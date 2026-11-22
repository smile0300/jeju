const fs = require('fs');
const path = require('path');

/**
 * 맛집 지도용 제주 구역(읍면동 묶음) 경계 생성기
 *
 * 입력: southkorea-maps 읍면동 경계 TopoJSON (kostat 2013, skorea_submunicipalities_topo.json)
 *       https://raw.githubusercontent.com/southkorea/southkorea-maps/master/kostat/2013/json/skorea_submunicipalities_topo.json
 * 출력: src/data/jeju-zones.js   — 구역별 채움 path·라벨 위치·범위, 구역 사이 경계선 path, 위경도→SVG 좌표 변환
 *       tools/jeju_zones_rings.json — 구역별 폴리곤(SVG 좌표). build_eats_data.js가 가게마다 구역 키(z)를 붙일 때 쓴다
 *
 * 사용: node execution/build_jeju_zones.js <skorea_submunicipalities_topo.json>
 *
 * 좌표계는 execution/build_jeju_map.js(JEJU_MAP)와 같고, 확대해서 볼 수 있게 소수 1자리까지 남긴다.
 * TopoJSON의 arc를 한 번씩만 단순화하므로 이웃 구역 경계가 어긋나지 않는다. 추자도는 범위 밖이라 뺀다.
 */

const SRC = process.argv[2];
const OUT = path.join(__dirname, '..', 'src', 'data', 'jeju-zones.js');
const RINGS_OUT = path.join(__dirname, '..', 'tools', 'jeju_zones_rings.json');

const BBOX = { minLng: 126.14, maxLng: 127.0, minLat: 33.18, maxLat: 33.58 }; // build_jeju_map.js와 동일
const WIDTH = 1000;
const TOLERANCE = 0.0006; // 약 60m — 구역을 확대해도 경계가 각지지 않을 정도
const MIN_AREA = 4; // SVG 단위². 이보다 작은 무인도는 버림

const COS = Math.cos(((BBOX.minLat + BBOX.maxLat) / 2) * Math.PI / 180);
const SCALE = WIDTH / ((BBOX.maxLng - BBOX.minLng) * COS);
const r1 = v => Math.round(v * 10) / 10;
const project = ([lng, lat]) => [r1((lng - BBOX.minLng) * COS * SCALE), r1((BBOX.maxLat - lat) * SCALE)];

// 행정동(2013) → 지도 구역. 제주시내는 가게가 몰려 있어 다섯 구역으로 나눈다 (g: 'jcity')
const ZONE_OF = {
    노형동: 'jc_new', 연동: 'jc_new',
    일도1동: 'jc_old', 일도2동: 'jc_old', 이도1동: 'jc_old', 이도2동: 'jc_old', 삼도1동: 'jc_old', 삼도2동: 'jc_old', 건입동: 'jc_old', 용담1동: 'jc_old',
    용담2동: 'jc_air', 도두동: 'jc_air', 이호동: 'jc_air', 외도동: 'jc_air',
    아라동: 'jc_ara', 오라동: 'jc_ara',
    화북동: 'jc_east', 삼양동: 'jc_east', 봉개동: 'jc_east',
    애월읍: 'aewol', 한림읍: 'hallim', 한경면: 'hallim', 조천읍: 'jocheon', 구좌읍: 'gujwa', 우도면: 'udo',
    성산읍: 'seongsan', 표선면: 'pyoseon', 남원읍: 'pyoseon', 대정읍: 'daejeong', 안덕면: 'daejeong',
    중문동: 'jungmun', 예래동: 'jungmun', 대천동: 'jungmun',
    대륜동: 'seogwipo', 서홍동: 'seogwipo', 동홍동: 'seogwipo', 영천동: 'seogwipo', 효돈동: 'seogwipo',
    천지동: 'seogwipo', 중앙동: 'seogwipo', 정방동: 'seogwipo', 송산동: 'seogwipo',
};
const ORDER = ['jc_new', 'jc_old', 'jc_air', 'jc_ara', 'jc_east', 'aewol', 'hallim', 'jocheon', 'gujwa', 'udo', 'seongsan', 'pyoseon', 'jungmun', 'seogwipo', 'daejeong'];

// Douglas-Peucker (build_jeju_map.js와 같은 방식, 양 끝점 유지)
function simplify(points, tol) {
    if (points.length < 3) return points;
    const sqTol = tol * tol;
    const keep = new Uint8Array(points.length);
    keep[0] = keep[points.length - 1] = 1;
    const stack = [[0, points.length - 1]];
    while (stack.length) {
        const [a, b] = stack.pop();
        const ax = points[a][0] * COS, ay = points[a][1], bx = points[b][0] * COS, by = points[b][1];
        let maxD = 0, idx = -1;
        for (let i = a + 1; i < b; i++) {
            const px = points[i][0] * COS, py = points[i][1];
            const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy;
            let t = len ? ((px - ax) * dx + (py - ay) * dy) / len : 0;
            t = Math.max(0, Math.min(1, t));
            const ex = ax + t * dx - px, ey = ay + t * dy - py, d = ex * ex + ey * ey;
            if (d > maxD) { maxD = d; idx = i; }
        }
        if (maxD > sqTol && idx > 0) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
    }
    return points.filter((_, i) => keep[i]);
}

const area = ring => { let s = 0; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) s += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]); return s / 2; };
function centroid(ring) {
    let a = 0, cx = 0, cy = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const f = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
        a += f; cx += (ring[j][0] + ring[i][0]) * f; cy += (ring[j][1] + ring[i][1]) * f;
    }
    return [r1(cx / (3 * a)), r1(cy / (3 * a))];
}

function main() {
    if (!SRC || !fs.existsSync(SRC)) { console.error('Usage: node execution/build_jeju_zones.js <skorea_submunicipalities_topo.json>'); process.exit(1); }
    const topo = JSON.parse(fs.readFileSync(SRC, 'utf8'));
    const { scale: [sx, sy], translate: [tx, ty] } = topo.transform;
    const arcsLL = topo.arcs.map(arc => { let x = 0, y = 0; return arc.map(([dx, dy]) => { x += dx; y += dy; return [x * sx + tx, y * sy + ty]; }); });
    const arcCache = new Map();
    const arcPts = i => { if (!arcCache.has(i)) arcCache.set(i, simplify(arcsLL[i], TOLERANCE).map(project)); return arcCache.get(i); };
    const inBox = ([lng, lat]) => lng >= BBOX.minLng && lng <= BBOX.maxLng && lat >= BBOX.minLat && lat <= BBOX.maxLat;

    const geoms = Object.values(topo.objects)[0].geometries.filter(g => String(g.properties.code).startsWith('39'));
    const unknown = geoms.map(g => g.properties.name).filter(n => !ZONE_OF[n] && n !== '추자면');
    if (unknown.length) throw new Error('구역 미지정 행정동: ' + unknown.join(', '));

    const zones = {};
    const arcUse = new Map(); // arc 번호 → 쓰는 구역들
    for (const g of geoms) {
        const k = ZONE_OF[g.properties.name];
        if (!k) continue;
        const polys = g.type === 'Polygon' ? [g.arcs] : g.arcs;
        for (const poly of polys) {
            const outerIdx = poly[0];
            const ringLL = outerIdx.flatMap(i => (i < 0 ? arcsLL[~i].slice().reverse() : arcsLL[i]));
            if (!ringLL.every(inBox)) continue;
            for (const ringArcs of poly) {
                const ring = [];
                for (const i of ringArcs) {
                    const pts = i < 0 ? arcPts(~i).slice().reverse() : arcPts(i);
                    ring.push(...(ring.length ? pts.slice(1) : pts));
                    const a = i < 0 ? ~i : i;
                    if (!arcUse.has(a)) arcUse.set(a, new Set());
                    arcUse.get(a).add(k);
                }
                if (Math.abs(area(ring)) < MIN_AREA) continue;
                (zones[k] ||= []).push(ring);
            }
        }
    }

    // 구역 사이 경계선 = 서로 다른 두 구역이 함께 쓰는 arc
    const border = [];
    for (const [a, ks] of arcUse) if (ks.size > 1) border.push('M' + arcPts(a).map(p => p.join(',')).join('L'));

    const out = ORDER.map(k => {
        const rings = zones[k];
        if (!rings) throw new Error('구역 경계 없음: ' + k);
        const big = rings.reduce((m, r) => (Math.abs(area(r)) > Math.abs(area(m)) ? r : m));
        const xs = rings.flat().map(p => p[0]), ys = rings.flat().map(p => p[1]);
        return {
            k,
            d: rings.map(r => 'M' + r.map(p => p.join(',')).join('L') + 'Z').join(''),
            c: centroid(big),
            b: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)].map(r1),
        };
    });

    const content = `// 자동 생성: node execution/build_jeju_zones.js — 직접 수정하지 말 것
// 맛집 지도 구역(kostat 2013 읍면동 경계를 구역별로 묶어 단순화). 좌표계는 jeju-map.js와 같고 소수 1자리.
// k 구역 키 · d 채움 path · c 라벨 위치 · b 범위 [x0, y0, x1, y1]

export const ZONES = ${JSON.stringify(out)};

export const ZONE_BORDER = '${border.join('')}';

const BBOX = ${JSON.stringify(BBOX)};
const COS = ${COS.toFixed(6)};
const SCALE = ${SCALE.toFixed(4)};

/** 위경도 → 구역 지도 SVG 좌표 (소수 1자리, 확대용) */
export const projectFine = (lat, lng) => [
    Math.round((lng - BBOX.minLng) * COS * SCALE * 10) / 10,
    Math.round((BBOX.maxLat - lat) * SCALE * 10) / 10,
];
`;
    fs.writeFileSync(OUT, content, 'utf8');
    fs.writeFileSync(RINGS_OUT, JSON.stringify({ BBOX, COS, SCALE, zones: Object.fromEntries(ORDER.map(k => [k, zones[k]])) }));
    console.log(`zones: ${out.length}, border arcs: ${border.length}, size: ${(Buffer.byteLength(content) / 1024).toFixed(1)} KB → ${OUT}`);
}

main();
