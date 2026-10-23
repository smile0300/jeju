const fs = require('fs');
const path = require('path');

/**
 * 제주 외곽선 SVG 생성기
 *
 * 입력: southkorea-maps 시도 경계 GeoJSON (kostat 2013, skorea_provinces_geo.json)
 *       https://raw.githubusercontent.com/southkorea/southkorea-maps/master/kostat/2013/json/skorea_provinces_geo.json
 * 출력: src/data/jeju-map.js — 본섬 외곽선 path + 위경도→SVG 좌표 변환 상수
 *
 * 사용: node execution/build_jeju_map.js <geojson 경로>
 *
 * 본섬과 우도만 남긴다 (추자도는 너무 북쪽이라 지도 비율을 망침, 소형 무인도는 노이즈).
 */

const SRC = process.argv[2];
const OUT = path.join(__dirname, '..', 'src', 'data', 'jeju-map.js');

// 지도 범위 (경도/위도). 본섬 + 우도가 들어가는 박스 (가파도·마라도는 너무 작아 어차피 빠짐)
const BBOX = { minLng: 126.14, maxLng: 127.0, minLat: 33.18, maxLat: 33.58 };
const WIDTH = 1000;
const TOLERANCE = 0.0025; // 단순화 허용 오차(도). 약 250m — 섬 전체 축척에선 보이지 않음
const MIN_RING_POINTS = 8; // 단순화 후 이보다 작은 섬은 버림

const COS = Math.cos(((BBOX.minLat + BBOX.maxLat) / 2) * Math.PI / 180);
const SCALE = WIDTH / ((BBOX.maxLng - BBOX.minLng) * COS);
const HEIGHT = Math.round((BBOX.maxLat - BBOX.minLat) * SCALE);

const project = ([lng, lat]) => [
    (lng - BBOX.minLng) * COS * SCALE,
    (BBOX.maxLat - lat) * SCALE,
];

// Douglas-Peucker 단순화 (도 단위, 경도는 COS 보정)
function simplify(points, tol) {
    if (points.length < 3) return points;
    const sqTol = tol * tol;
    const keep = new Uint8Array(points.length);
    keep[0] = keep[points.length - 1] = 1;
    const stack = [[0, points.length - 1]];
    while (stack.length) {
        const [a, b] = stack.pop();
        const [ax, ay] = [points[a][0] * COS, points[a][1]];
        const [bx, by] = [points[b][0] * COS, points[b][1]];
        let maxD = 0, idx = -1;
        for (let i = a + 1; i < b; i++) {
            const px = points[i][0] * COS, py = points[i][1];
            const dx = bx - ax, dy = by - ay;
            const len = dx * dx + dy * dy;
            let t = len ? ((px - ax) * dx + (py - ay) * dy) / len : 0;
            t = Math.max(0, Math.min(1, t));
            const ex = ax + t * dx - px, ey = ay + t * dy - py;
            const d = ex * ex + ey * ey;
            if (d > maxD) { maxD = d; idx = i; }
        }
        if (maxD > sqTol && idx > 0) {
            keep[idx] = 1;
            stack.push([a, idx], [idx, b]);
        }
    }
    return points.filter((_, i) => keep[i]);
}

function main() {
    if (!SRC || !fs.existsSync(SRC)) {
        console.error('Usage: node execution/build_jeju_map.js <skorea_provinces_geo.json>');
        process.exit(1);
    }
    const geo = JSON.parse(fs.readFileSync(SRC, 'utf8'));
    const jeju = geo.features.find(f => f.properties.code === '39');
    if (!jeju) throw new Error('제주(code 39) feature not found');

    const inBox = ([lng, lat]) => lng >= BBOX.minLng && lng <= BBOX.maxLng && lat >= BBOX.minLat && lat <= BBOX.maxLat;
    const parts = [];
    for (const polygon of jeju.geometry.coordinates) {
        const outer = polygon[0];
        if (!outer.every(inBox)) continue;
        const ring = simplify(outer, TOLERANCE);
        if (ring.length < MIN_RING_POINTS) continue;
        parts.push('M' + ring.map(p => project(p).map(v => Math.round(v)).join(',')).join('L') + 'Z');
    }

    const content = `// 자동 생성: node execution/build_jeju_map.js — 직접 수정하지 말 것
// 제주 본섬 외곽선(kostat 2013 시도 경계 단순화)과 위경도 → SVG 좌표 변환

export const JEJU_MAP = {
    width: ${WIDTH},
    height: ${HEIGHT},
    path: '${parts.join('')}',
};

const BBOX = ${JSON.stringify(BBOX)};
const COS = ${COS.toFixed(6)};
const SCALE = ${SCALE.toFixed(4)};

export const projectLatLng = (lat, lng) => [
    Math.round((lng - BBOX.minLng) * COS * SCALE),
    Math.round((BBOX.maxLat - lat) * SCALE),
];
`;
    fs.writeFileSync(OUT, content, 'utf8');
    console.log(`islands: ${parts.length}, size: ${(Buffer.byteLength(content) / 1024).toFixed(1)} KB → ${OUT}`);
}

main();
