const fs = require('fs');
const html = fs.readFileSync('src/parts/cctv.html', 'utf8');

const pathRegex = /<path d="([\s\S]*?)" \/>/g;
let match;
let foundPaths = [];

console.log("Searching for ALL small paths in top-left...");

while ((match = pathRegex.exec(html)) !== null) {
    const d = match[1];
    const coords = d.match(/-?\d+\.?\d+/g) || [];
    if (coords.length < 50) { // Simple paths
        let minX = Infinity, minY = Infinity;
        for (let i = 0; i < coords.length; i += 2) {
            const x = parseFloat(coords[i]);
            const y = parseFloat(coords[i+1]);
            if (x < minX) minX = x;
            if (y < minY) minY = y;
        }
        
        if (minX < 200 && minY < 200) {
            console.log(`Small Top-Left Path: pts=${d.split(/[LA]/).length}, x=${minX}, y=${minY}, d="${d.substring(0, 50)}..."`);
            foundPaths.push(match[0]);
        }
    }
}
console.log(`Total candidates found: ${foundPaths.length}`);
