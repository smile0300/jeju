const fs = require('fs');
const html = fs.readFileSync('src/parts/cctv.html', 'utf8');

const pathRegex = /<path d="([\s\S]*?)" \/>/g;
let match;
let count = 0;

while ((match = pathRegex.exec(html)) !== null) {
    const d = match[1];
    const coords = d.match(/-?\d+\.?\d+/g) || [];
    if (coords.length === 0) continue;

    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < coords.length; i += 2) {
        const x = parseFloat(coords[i]);
        const y = parseFloat(coords[i+1]);
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
    }

    // Checking for any path in the Chuja-do/noise zone (Top zone, left/mid)
    if (maxY < 580 && maxX < 3000) {
        count++;
        console.log(`Found left-over path: maxY=${maxY}, maxX=${maxX}, pts=${d.split(/[LA]/).length}`);
    }
}

console.log(`Total offending paths remaining: ${count}`);
if (count === 0) {
    console.log("SUCCESS: Zone is officially clean.");
} else {
    console.log("WARNING: There are still paths in the restricted zone.");
}
