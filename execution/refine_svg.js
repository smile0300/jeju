const fs = require('fs');
let html = fs.readFileSync('src/parts/cctv.html', 'utf8');

// 1. Remove the large background path(s)
// It usually looks like <path d="M-2,-2 L3510,-2 L3510,2483 L-2,2483 L-2,-2" />
html = html.replace(/<path d="M-2,-2 L3510,-2 L3510,2483 L-2,2483 L-2,-2" \/>/g, '');
html = html.replace(/<path d="M-2,-2 L3510,-2 L3510,2483 L-2,-2" \/>/g, '');

// 2. Adjust labels for better positioning in the 3507x2480 space
const newLabels = `
<g fill="#333" font-size="80" font-weight="bold" pointer-events="none" text-anchor="middle" font-family="'Outfit', sans-serif">
    <text x="1750" y="750" fill="#cc3333">제주시</text>
    <text x="1750" y="1950" fill="#3366cc">서귀포시</text>
    <text x="800" y="1350" fill="#996600">서부</text>
    <text x="2700" y="1350" fill="#006666">동부</text>
    <text x="1750" y="1350" fill="#fff" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))">한라산</text>
    <text x="3280" y="580" font-size="50" fill="#0099cc">우도</text>
</g>`;

html = html.replace(/<g fill="#333" font-size="60"[\s\S]*?<\/g>/, newLabels);

fs.writeFileSync('src/parts/cctv.html', html);
console.log("cctv.html refined: removed background rectangle and updated labels.");
