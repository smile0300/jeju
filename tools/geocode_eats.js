// 맛집(src/data/eats.js) 주소 → 좌표. 카카오 로컬 API(주소 검색, 실패 시 '이름 + 동네' 키워드 검색)
// 결과는 tools/eats_geo.json에 주소별로 캐시해 두고, 이미 있는 주소는 다시 묻지 않는다.
// build_eats_data.js · build_course_eats.js가 이 캐시를 읽는다.
//
// 실행: node tools/geocode_eats.js   (.dev.vars의 KAKAO_REST_KEY 사용)
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CACHE = path.join(__dirname, 'eats_geo.json');

const vars = fs.readFileSync(path.join(ROOT, '.dev.vars'), 'utf8');
const KEY = (vars.match(/^KAKAO_REST_KEY\s*=\s*"?([^"\r\n]+)"?/m) || [])[1];
if (!KEY) { console.error('KAKAO_REST_KEY 없음 (.dev.vars)'); process.exit(1); }

const src = fs.readFileSync(path.join(ROOT, 'src', 'data', 'eats.js'), 'utf8');
const EATS = JSON.parse(src.slice(src.indexOf('= [') + 2, src.lastIndexOf(']') + 1));
const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};

// 제주 범위 밖 결과(동명 주소·가게)는 버린다
const inJeju = (lat, lng) => lat > 33.1 && lat < 33.6 && lng > 126.1 && lng < 127.0;

async function kakao(kind, query) {
    const url = `https://dapi.kakao.com/v2/local/search/${kind}.json?query=${encodeURIComponent(query)}&size=5`;
    const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KEY}` } });
    if (!res.ok) throw new Error(`${kind} ${res.status}`);
    const docs = (await res.json()).documents || [];
    const hit = docs.map(d => [parseFloat(d.y), parseFloat(d.x)]).find(([lat, lng]) => inJeju(lat, lng));
    return hit ? hit.map(v => Math.round(v * 1e4) / 1e4) : null;
}

(async () => {
    // 추자도는 제주 본섬 코스와 이어지지 않고, 키워드 검색이 본섬 동명 가게를 잡으므로 뺀다
    for (const a of Object.keys(cache)) if (/추자면/.test(a)) delete cache[a];
    const todo = [...new Map(EATS.filter(d => d.a && !cache[d.a] && !/추자면/.test(d.a)).map(d => [d.a, d])).values()];
    console.log('전체', EATS.length, '캐시', Object.keys(cache).length, '새로 조회', todo.length);
    let miss = 0;
    for (const d of todo) {
        // 주소 끝의 층·호수·괄호 설명은 주소 검색을 실패시키므로 떼고 묻는다
        const addr = d.a.replace(/\s*\(.*?\)/g, '').replace(/,.*$/, '').replace(/\s+\d+층.*$/, '').trim();
        let ll = await kakao('address', addr).catch(() => null);
        if (!ll) ll = await kakao('keyword', `제주 ${d.n}`).catch(() => null);
        if (ll) cache[d.a] = ll; else { miss++; console.log('실패:', d.n, '|', d.a); }
        await new Promise(r => setTimeout(r, 60));
    }
    fs.writeFileSync(CACHE, JSON.stringify(cache, null, 0));
    console.log('완료 · 실패', miss, '· 캐시', Object.keys(cache).length);
})();
