const fs = require('fs');

const path = 'src/parts/cctv.html';
console.log('Reading file...');
let content = fs.readFileSync(path, 'utf8');

// 1. 우도 교체
const udoStartStr = '<g class="jeju-region region-udo"';
const udoStart = content.indexOf(udoStartStr);
if (udoStart !== -1) {
    let udoEnd = content.indexOf('</g>', udoStart);
    if (udoEnd !== -1) {
        udoEnd += 4;
        const udoNew = '<g class="jeju-region region-udo" onclick="filterByRegion(\'udo\')"><path d="M3250,520 C3260,500 3290,500 3310,510 C3330,525 3320,560 3300,580 C3280,600 3240,580 3230,560 C3220,540 3240,530 3250,520 Z" /></g>';
        content = content.substring(0, udoStart) + udoNew + content.substring(udoEnd);
        console.log('우도(Udo) 모양 교체 완료');
    }
}

// 2. 추자도 삭제
const parts = content.split('<path d="M');
let newParts = [parts[0]];
let removed = 0;

for (let i = 1; i < parts.length; i++) {
    let p = parts[i];
    const commaIdx = p.indexOf(',');
    const spaceIdx = p.indexOf(' ', commaIdx);
    
    let keep = true;
    if (commaIdx !== -1 && spaceIdx !== -1 && commaIdx < 20 && spaceIdx < 30) {
        const x = parseFloat(p.substring(0, commaIdx));
        const y = parseFloat(p.substring(commaIdx + 1, spaceIdx));
        
        if (!isNaN(x) && !isNaN(y) && y < 350 && x < 3000) {
            keep = false;
            removed++;
            const endTag = p.indexOf('/>');
            if (endTag !== -1) {
                const remaining = p.substring(endTag + 2);
                if (remaining.trim()) {
                    newParts[newParts.length - 1] += remaining;
                }
            }
        }
    }
    
    if (keep) {
        newParts.push(p);
    }
}

const finalContent = newParts.join('<path d="M');
fs.writeFileSync(path, finalContent, 'utf8');
console.log('추자도 삭제 완료: 총 ' + removed + '개 경로 제거');
