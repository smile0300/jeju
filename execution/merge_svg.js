const fs = require('fs');
const paths = fs.readFileSync('processed_paths.html', 'utf8');
const template = fs.readFileSync('src/parts/cctv.html', 'utf8');

// Precise replacement for the SVG element
const newSvg = `<svg class="jeju-svg-map" viewBox="0 0 3507 2480" xmlns="http://www.w3.org/2000/svg">
${paths}
<g fill="#333" font-size="60" font-weight="bold" pointer-events="none" text-anchor="middle" font-family="'Outfit', sans-serif">
    <text x="1750" y="800">제주시</text>
    <text x="1750" y="1800">서귀포시</text>
    <text x="800" y="1300">서부</text>
    <text x="2700" y="1300">동부</text>
    <text x="1750" y="1300" fill="#fff">한라산</text>
    <text x="3250" y="600" font-size="40">우도</text>
</g>
<g id="cctv-markers-layer"></g>
</svg>`;

const updated = template.replace(/<svg class="jeju-svg-map"[\s\S]*?<\/svg>/, newSvg);
fs.writeFileSync('src/parts/cctv.html', updated);
console.log("cctv.html updated with high-precision SVG.");
