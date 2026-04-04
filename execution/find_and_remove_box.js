const fs = require('fs');

const html = fs.readFileSync('src/parts/cctv.html', 'utf8');

// Find all paths in region-jeju
const jejuMatch = html.match(/<g class="jeju-region region-jeju"[\s\S]*?<\/g>/);
if (!jejuMatch) {
    console.log("Region-jeju not found");
    process.exit(1);
}

let groupContent = jejuMatch[0];
const originalGroup = groupContent;

const pathRegex = /<path d="([\s\S]*?)" \/>/g;
let match;
let pathsToRemove = [];

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
    
    // The subagent said it's in the top left and large.
    // Let's target anything large and near the top left corner (0,0)
    // Or anything that looks like a rectangular boundary.
    
    // Heuristic for the "peach box":
    // 1. It's in the top left quadrant (minX < 500, minY < 500)
    // 2. It has a large size (width > 200, height > 200)
    // 3. It has few points (simple rectangle)
    const pointsCount = d.split(/[LA]/).length;
    
    if (minX < 1000 && minY < 1000 && width > 300 && height > 300 && pointsCount < 20) {
        console.log(`Potential background box found: x=${minX}, y=${minY}, w=${width}, h=${height}, points=${pointsCount}`);
        pathsToRemove.push(match[0]);
    }
}

pathsToRemove.forEach(p => {
    groupContent = groupContent.replace(p, '');
    console.log("Removing path...");
});

const newHtml = html.replace(originalGroup, groupContent);
fs.writeFileSync('src/parts/cctv.html', newHtml);

console.log(`Cleaned ${pathsToRemove.length} paths.`);
