// 단골식당 목록(tools/eats_regular.json의 places)에 카카오 로컬 키워드 검색으로 업종·전화·주소를 붙인다.
// 같은 카카오 장소 id가 검색되지 않으면 폐업·삭제로 보고 found:false로 남긴다.
// 결과는 tools/eats_regular_info.json (장소 id별 캐시) — build_eats_data.js가 읽는다.
//
// 실행: node tools/fetch_regular_places.js   (.dev.vars의 KAKAO_REST_KEY 사용, 이미 조회한 id는 건너뜀)
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'eats_regular_info.json');
const vars = fs.readFileSync(path.join(ROOT, '.dev.vars'), 'utf8');
const KEY = (vars.match(/^KAKAO_REST_KEY\s*=\s*"?([^"\r\n]+)"?/m) || [])[1];
if (!KEY) { console.error('KAKAO_REST_KEY 없음 (.dev.vars)'); process.exit(1); }

const { places } = JSON.parse(fs.readFileSync(path.join(__dirname, 'eats_regular.json'), 'utf8'));
const cache = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};

async function search(q, lat, lon) {
    const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(q)}&x=${lon}&y=${lat}&radius=500&size=15`;
    const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KEY}` } });
    if (!res.ok) throw new Error(`keyword ${res.status}`);
    return (await res.json()).documents || [];
}

(async () => {
    let n = 0, miss = 0;
    for (const line of places) {
        const [name, , id, lat, lon] = line.split('|');
        if (cache[id]) continue;
        let docs = await search(name, lat, lon).catch(() => []);
        let d = docs.find(x => x.id === id);
        // 이름이 바뀐 가게는 같은 id가 안 잡힐 수 있어 이름 앞부분으로 한 번 더 찾는다
        if (!d && name.length > 3) { docs = await search(name.slice(0, 3), lat, lon).catch(() => []); d = docs.find(x => x.id === id); }
        cache[id] = d
            ? { found: true, name: d.place_name, cat: d.category_name, group: d.category_group_code, tel: d.phone, addr: d.road_address_name || d.address_name, url: d.place_url, ll: [Math.round(+d.y * 1e4) / 1e4, Math.round(+d.x * 1e4) / 1e4] }
            : { found: false, name };
        if (!d) { miss++; console.log('못 찾음:', name); }
        if (++n % 50 === 0) { fs.writeFileSync(OUT, JSON.stringify(cache, null, 0)); console.log('진행', n); }
        await new Promise(r => setTimeout(r, 80));
    }
    fs.writeFileSync(OUT, JSON.stringify(cache, null, 0));
    console.log('완료 · 새로 조회', n, '· 못 찾음', miss, '· 캐시', Object.keys(cache).length);
})();
