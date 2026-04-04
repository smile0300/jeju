const fs = require('fs');
const html = fs.readFileSync('src/parts/cctv.html', 'utf8');

const pathRegex = /<path d="([\s\S]*?)" \/>/g;
let match;

console.log("Searching all paths in cctv.html for top-left box...");

while ((match = pathRegex.exec(html)) !== null) {
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
    
    // Target any large path in the top left area
    if (minX < 1000 && minY < 1000 && width > 400 && height > 400) {
        console.log(`Global Path candidate: x=${minX.toFixed(1)}, y=${minY.toFixed(1)}, w=${width.toFixed(1)}, h=${height.toFixed(1)}, pts=${d.split(/[LA]/).length}`);
        console.log(`Content starts with: ${d.substring(0, 50)}`);
    }
}
