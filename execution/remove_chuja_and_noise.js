const fs = require('fs');
let html = fs.readFileSync('src/parts/cctv.html', 'utf8');

const pathRegex = /<path d="([\s\S]*?)" \/>/g;
let match;
let pathsToRemove = [];

console.log("Identifying paths to remove (Chuja-do and top-left noise)...");

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

    // Heuristic:
    // 1. Path is in the top zone (Y < 580)
    // 2. Path is NOT Udo (Udo is in the far right, X > 3000)
    // 3. Main Island starts around Y=600.
    
    if (maxY < 580 && maxX < 3000) {
        // This targets Chuja-do and the background boxes at the top and left.
        pathsToRemove.push(match[0]);
    }
}

console.log(`Found ${pathsToRemove.length} paths to remove.`);

pathsToRemove.forEach(p => {
    html = html.replace(p, '');
});

fs.writeFileSync('src/parts/cctv.html', html);
console.log("Cleanup complete. Chuja-do and top-left artifacts removed.");
