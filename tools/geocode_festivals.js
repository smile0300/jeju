// 축제(public/assets/curated_festivals.js) → 좌표. 비짓제주 API를 contentsid로 조회해 위도·경도를 받는다.
// 크롤링한 축제 목록에는 주소가 비어 있어서 일정 짜기(planner/itinerary.js)가 축제 위치를 알 수 없기 때문.
// 결과: src/data/festival-geo.js  { contentsid: [lat, lng] }  — 이미 있는 id는 다시 묻지 않는다.
//
// 실행: node tools/geocode_festivals.js   (.dev.vars의 VISITJEJU_API_KEY 사용)
// 축제 크롤러(execution/fetch_festivals.js)를 돌린 뒤 같이 돌릴 것.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'src', 'data', 'festival-geo.js');

const vars = fs.readFileSync(path.join(ROOT, '.dev.vars'), 'utf8');
const KEY = (vars.match(/^VISITJEJU_API_KEY\s*=\s*"?([^"\r\n]+)"?/m) || [])[1];
const KAKAO = (vars.match(/^KAKAO_REST_KEY\s*=\s*"?([^"\r\n]+)"?/m) || [])[1];
if (!KEY) { console.error('VISITJEJU_API_KEY 없음 (.dev.vars)'); process.exit(1); }

global.window = {};
require(path.join(ROOT, 'public', 'assets', 'curated_festivals.js'));
const ids = [...new Set(Object.values(window.FESTIVAL_DATA.months).flat().map(f => f.contentsid).filter(Boolean))];

const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8').replace(/^[\s\S]*?= /, '').replace(/;\s*$/, '')) : {};
const inJeju = (lat, lng) => lat > 33.1 && lat < 33.6 && lng > 126.1 && lng < 127.0;

// 비짓제주에 위도·경도가 없으면 주소(괄호·장소명 뗀 앞부분)를 카카오 주소 검색으로 바꾼다
async function kakaoAddr(addr) {
    if (!KAKAO || !addr) return null;
    const q = addr.replace(/\s*\(.*$/, '').trim();
    const res = await fetch(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(q)}`, { headers: { Authorization: `KakaoAK ${KAKAO}` } });
    const d = (await res.json()).documents?.[0];
    const lat = parseFloat(d?.y), lng = parseFloat(d?.x);
    return inJeju(lat, lng) ? [lat, lng] : null;
}

(async () => {
    const out = {};
    let miss = 0;
    for (const id of ids) {
        if (prev[id]) { out[id] = prev[id]; continue; }
        try {
            const res = await fetch(`https://api.visitjeju.net/vsjApi/contents/searchList?apiKey=${KEY}&locale=kr&cid=${id}`);
            const it = (await res.json()).items?.[0];
            let ll = [parseFloat(it?.latitude), parseFloat(it?.longitude)];
            if (!inJeju(...ll)) ll = await kakaoAddr(it?.roadaddress || it?.address);
            if (ll) out[id] = ll.map(v => Math.round(v * 1e4) / 1e4);
            else { miss++; console.log('좌표 없음:', id, it?.title || '', '|', it?.address || ''); }
        } catch (e) { miss++; console.log('실패:', id, e.message); }
        await new Promise(r => setTimeout(r, 80));
    }
    fs.writeFileSync(OUT, `// 자동 생성: node tools/geocode_festivals.js (비짓제주 API 위도·경도). 손으로 고치지 말 것.\nexport const FESTIVAL_POS = ${JSON.stringify(out)};\n`);
    console.log('축제', ids.length, '· 좌표', Object.keys(out).length, '· 없음', miss);
})();
