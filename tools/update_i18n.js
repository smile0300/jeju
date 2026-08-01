const fs = require('fs');
const file = 'c:/jeju-live/src/js/i18n.js';
let content = fs.readFileSync(file, 'utf8');

// Replace ko: '사진 첨부 (선택)' -> '사진 첨부'
content = content.replace(/'modal\.lost\.photo\.label':\s*'사진 첨부 \(선택\)'/g, "'modal.lost.photo.label':'사진 첨부'");
// If it was already encoded or mangled, just replace everything matching the key:
content = content.replace(/'modal\.lost\.photo\.label':\s*'.*?'/g, (match, offset, string) => {
    // Find context (zh, ko, en)
    const prevText = string.substring(Math.max(0, offset - 500), offset);
    if (prevText.includes("'ko':")) return "'modal.lost.photo.label':'사진 첨부'";
    if (prevText.includes("'en':")) return "'modal.lost.photo.label':'Upload Photo'";
    if (prevText.includes("'zh':")) return "'modal.lost.photo.label':'上传照片'";
    return match;
});

fs.writeFileSync(file, content, 'utf8');
console.log('i18n updated');
