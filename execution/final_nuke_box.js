const fs = require('fs');
let html = fs.readFileSync('src/parts/cctv.html', 'utf8');

// The subagent said it's peach colored (like West or Jeju region) and rectangular.
const regions = ['region-jeju', 'region-west'];
let removedCount = 0;

regions.forEach(regionClass => {
    const regex = new RegExp('<g class="jeju-region ' + regionClass + '"[\\s\\S]*?<\/g>', 'g');
    const match = html.match(regex);
    if (!match) return;

    let groupContent = match[0];
    const originalGroup = groupContent;
    
    const pathRegex = /<path d="([\s\S]*?)" \/>/g;
    let pm;
    let pathsToRemove = [];

    while ((pm = pathRegex.exec(originalGroup)) !== null) {
        const d = pm[1];
        const coords = d.match(/-?\d+\.?\d+/g) || [];
        if (coords.length === 0) continue;

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

        // Condition for the noise box:
        // 1. Located in the top-left area (minX < 600, minY < 600)
        // 2. Large enough to be seen (width > 100, height > 100)
        // 3. Or it's a simple rectangle (pts < 30)
        if (minX < 600 && minY < 600) {
            console.log(`Candidate in ${regionClass}: x=${minX.toFixed(1)}, y=${minY.toFixed(1)}, w=${width.toFixed(1)}, h=${height.toFixed(1)}, pts=${d.split(/[LA]/).length}`);
            // If it's a large box at the top left, it's definitely noise.
            if (width > 200 && height > 200) {
                pathsToRemove.push(pm[0]);
                console.log("-> MARKED FOR REMOVAL (Large Top-Left Box)");
            } else if (d.split(/[LA]/).length < 50 && (minX < 400 && minY < 400)) {
                 // Even smaller paths in extreme top-left are likely noise if simple
                 pathsToRemove.push(pm[0]);
                 console.log("-> MARKED FOR REMOVAL (Simple Top-Left Noise)");
            }
        }
    }

    pathsToRemove.forEach(p => {
        groupContent = groupContent.replace(p, '');
        removedCount++;
    });

    html = html.replace(originalGroup, groupContent);
});

fs.writeFileSync('src/parts/cctv.html', html);
console.log(`Removed ${removedCount} total noise paths.`);
