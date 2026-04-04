const fs = require('fs');

let html = fs.readFileSync('src/parts/cctv.html', 'utf8');

// 1. Target the region-jeju group
const jejuGroupRegex = /<g class="jeju-region region-jeju"[\s\S]*?<\/g>/;
const match = html.match(jejuGroupRegex);

if (match) {
    let groupContent = match[0];
    const originalGroupContent = groupContent;
    
    // Find paths that look like large rectangles
    // e.g., M... L... L... L... L... Z or fewer
    const pathRegex = /<path d="([\s\S]*?)" \/>/g;
    let pathMatch;
    let pathsToRemove = [];
    
    while ((pathMatch = pathRegex.exec(groupContent)) !== null) {
        const d = pathMatch[1];
        const points = d.split(/[LA]/);
        
        // If it's a simple rectangle (approx 4-6 points) and covers a large area
        if (points.length < 10) {
            // Extract coordinates to check bounds
            const coords = d.match(/-?\d+\.?\d+/g);
            if (coords && coords.length >= 8) {
                const xs = [];
                const ys = [];
                for(let i=0; i<coords.length; i+=2) {
                    xs.push(parseFloat(coords[i]));
                    ys.push(parseFloat(coords[i+1]));
                }
                const minX = Math.min(...xs);
                const maxX = Math.max(...xs);
                const minY = Math.min(...ys);
                const maxY = Math.max(...ys);
                
                const width = maxX - minX;
                const height = maxY - minY;
                
                // If it's huge (mostly background or maritime box)
                if (width > 300 && height > 300) {
                    console.log(`Removing large path: width=${width}, height=${height}, start=${d.substring(0, 50)}`);
                    pathsToRemove.push(pathMatch[0]);
                }
            }
        }
    }
    
    pathsToRemove.forEach(p => {
        groupContent = groupContent.replace(p, '');
    });
    
    html = html.replace(originalGroupContent, groupContent);
}

// 2. Final check for ANY remaining M-2,-2 rectangles anywhere
html = html.replace(/<path d="M-2,-2 L3510,-2 L3510,2483 L-2,2483 L-2,-2" \/>/g, '');

// 3. Improve label styles (glow effect)
const enhancedLabels = `
<g fill="#333" font-size="90" font-weight="900" pointer-events="none" text-anchor="middle" font-family="'Outfit', sans-serif">
    <filter id="textGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="5" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <text x="1750" y="750" fill="#e63946" filter="url(#textGlow)">제주시</text>
    <text x="1750" y="1950" fill="#457b9d" filter="url(#textGlow)">서귀포시</text>
    <text x="800" y="1350" fill="#f4a261" filter="url(#textGlow)">서부</text>
    <text x="2700" y="1350" fill="#2a9d8f" filter="url(#textGlow)">동부</text>
    <text x="1750" y="1350" fill="#fff" filter="drop-shadow(0 4px 8px rgba(0,0,0,0.8))">한라산</text>
    <text x="3280" y="580" font-size="60" fill="#00b4d8" filter="url(#textGlow)">우도</text>
</g>`;

html = html.replace(/<g fill="#333" font-size="80"[\s\S]*?<\/g>/, enhancedLabels);

fs.writeFileSync('src/parts/cctv.html', html);
console.log("cctv.html cleaned and labels enhanced.");
