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

console.log("Searching for small-point-count paths in region-jeju...");

while ((match = pathRegex.exec(groupContent)) !== null) {
    const d = match[1];
    const pts = d.split(/[LA]/).length;
    
    if (pts < 20) {
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
        console.log(`Small point path: pts=${pts}, x=${minX}, y=${minY}, w=${maxX-minX}, h=${maxY-minY}, d="${d}"`);
    }
}
