const fs = require('fs');
const path = require('path');

const targetFile = 'c:\\jeju-live\\src\\parts\\cctv.html';

if (!fs.existsSync(targetFile)) {
    console.error(`Error: ${targetFile} not found.`);
    process.exit(1);
}

let content = fs.readFileSync(targetFile, 'utf8');

// 1. Remove background path
const bgPattern = /<path d="M-2,-2 L3510,-2 L3510,2483 L-2,2483 L-2,-2" \/>/g;
content = content.replace(bgPattern, '');

// 2. Optimize Path Data
content = content.replace(/d="([^"]+)"/g, (match, d) => {
    // Round to 1 decimal place and remove .0
    const optimizedD = d.replace(/[-+]?\d*\.\d+|\d+/g, (n) => {
        let num = parseFloat(n);
        let str = num.toFixed(1);
        if (str.endsWith('.0')) str = str.slice(0, -2);
        return str;
    });
    // Remove extra spaces
    const cleanedD = optimizedD.replace(/\s+/g, ' ').trim();
    return `d="${cleanedD}"`;
});

fs.writeFileSync(targetFile, content, 'utf8');
console.log(`Successfully optimized ${targetFile}`);
