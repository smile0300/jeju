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
let count = 0;

console.log("Analyzing paths in region-jeju...");

while ((match = pathRegex.exec(groupContent)) !== null) {
    const d = match[1];
    const coords = d.match(/-?\d+\.?\d+/g);
    if (!coords) continue;
    
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
    const pts = d.split(/[LA]/).length;
    
    // Log any path that could be a candidate for deletion
    // (large dimensions but potentially few points or just interesting bounds)
    if (width > 100 && height > 100) {
        console.log(`Path candidate: x=${minX.toFixed(1)}, y=${minY.toFixed(1)}, w=${width.toFixed(1)}, h=${height.toFixed(1)}, pts=${pts}, start=${d.substring(0, 30)}`);
    }
    count++;
}
console.log(`Total paths checked: ${count}`);
