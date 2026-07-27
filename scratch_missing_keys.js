const fs = require('fs');
const path = require('path');

const i18nContent = fs.readFileSync('c:/jeju-live/src/js/i18n.js', 'utf8');
const zhMatch = i18nContent.match(/zh:\s*\{([\s\S]*?)\},\s*ko:/);
const zhKeys = new Set();
if(zhMatch) {
    const keyRegex = /'([^']+)'\s*:/g;
    let match;
    while((match = keyRegex.exec(zhMatch[1])) !== null) {
        zhKeys.add(match[1]);
    }
} else {
    console.log('Failed to parse i18n.js');
    process.exit(1);
}

const usedKeys = new Set();
function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for(const file of files) {
        const fullPath = path.join(dir, file);
        if(fs.statSync(fullPath).isDirectory()) {
            scanDir(fullPath);
        } else if(/\.(js|html)$/.test(file)) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const callRegex = /(?:window\.)?t\(['"]([^'"]+)['"]\)/g;
            let match;
            while((match = callRegex.exec(content)) !== null) {
                usedKeys.add(match[1]);
            }
        }
    }
}
scanDir('c:/jeju-live/src');

const missing = [];
for(const key of usedKeys) {
    if(!zhKeys.has(key)) missing.push(key);
}

// console.log("Missing Keys:", missing);
console.log(JSON.stringify({ missing, totalUsed: usedKeys.size, totalDefined: zhKeys.size }, null, 2));
