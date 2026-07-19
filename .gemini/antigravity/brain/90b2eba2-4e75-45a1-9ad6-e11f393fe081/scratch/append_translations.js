const fs = require('fs');

const translated = JSON.parse(fs.readFileSync('c:/jeju-live/.gemini/antigravity/brain/90b2eba2-4e75-45a1-9ad6-e11f393fe081/scratch/translated.json', 'utf8'));
const festivalPath = 'c:/jeju-live/src/js/festival.js';
let content = fs.readFileSync(festivalPath, 'utf8');

const zhEntries = Object.entries(translated.zh).map(([k, v]) => `    '${k.replace(/'/g, "\\'")}': '${v.replace(/'/g, "\\'")}'`).join(',\n');
const enEntries = Object.entries(translated.en).map(([k, v]) => `    '${k.replace(/'/g, "\\'")}': '${v.replace(/'/g, "\\'")}'`).join(',\n');

content = content.replace(
    /(5월의 베리 슬로우': '「耽罗市集 x 慢村庄」5月的Very Slow')(\n};)/,
    `$1,\n    // === 추가 번역 (2026-07) ===\n${zhEntries}$2`
);

content = content.replace(
    /(5월의 베리 슬로우': 'Tamnana Market x Slow Village Event')(\n};)/,
    `$1,\n    // === 추가 번역 (2026-07) ===\n${enEntries}$2`
);

fs.writeFileSync(festivalPath, content, 'utf8');
console.log('Appended? ' + content.includes('대한민국 제주정원문화박람회'));
