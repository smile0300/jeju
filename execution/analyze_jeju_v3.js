const fs = require('fs');
const html = fs.readFileSync('src/parts/cctv.html', 'utf8');

const jejuMatch = html.match(/<g class="jeju-region region-jeju"[\s\S]*?<\/g>/);
if (!jejuMatch) {
    console.log("Region-jeju not found");
    process.exit(1);
}

let groupContent = jejuMatch[0];
const pathRegex = /<path d="([\s\S]*?)" \/>/g;
let match;

console.log("Analyzing all paths in region-jeju...");

while ((match = pathRegex.exec(groupContent)) !== null) {
    const d = match[1];
    const coords = d.match(/-?\d+\.?\d+/g) || [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < coords.length; i += 2) {
        const x = parseFloat(coords[i]);
        const y = parseFloat(coords[i+1]);
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
    }
    const width = maxX - minX;
    const height = maxY - minY;
    
    // If it spans a significant part of the top-left area
    if (minX < 500 && minY < 500 && width > 100) {
        console.log(`Path near origin: x=${minX.toFixed(1)}, y=${minY.toFixed(1)}, w=${width.toFixed(1)}, h=${height.toFixed(1)}, pts=${d.split(/[LA]/).length}`);
    }
}
