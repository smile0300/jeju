const fs = require('fs');
const html = fs.readFileSync('src/parts/cctv.html', 'utf8');

const pathRegex = /<path d="([\s\S]*?)" \/>/g;
let match;
let count = 0;

console.log("Analyzing Y-coordinates of all paths...");

while ((match = pathRegex.exec(html)) !== null) {
    const d = match[1];
    const coords = d.match(/-?\d+\.?\d+/g) || [];
    if (coords.length === 0) continue;

    let maxY = -Infinity;
    for (let i = 1; i < coords.length; i += 2) {
        const y = parseFloat(coords[i]);
        if (y > maxY) maxY = y;
    }

    if (maxY < 550) {
        console.log(`Path in top zone (maxY=${maxY.toFixed(1)}): pts=${d.split(/[LA]/).length}, start="${d.substring(0, 40)}..."`);
        count++;
    }
}
console.log(`Total paths in top zone: ${count}`);
