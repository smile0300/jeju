const fs = require('fs');
const path = require('path');

const filePath = 'c:/jeju-live/src/parts/cctv.html';
const content = fs.readFileSync(filePath, 'utf8');

// 1. Udo paths extract
const udoMatch = content.match(/<g class="[^"]*region-udo"[^>]*>([\s\S]*?)<\/g>/);
if (!udoMatch) {
    console.error('region-udo not found');
    process.exit(1);
}
const udoPaths = udoMatch[1];

// 2. East group find
const eastMatch = content.match(/<g class="[^"]*region-east"[^>]*>/);
if (!eastMatch) {
    console.error('region-east not found');
    process.exit(1);
}

// 3. Perform replacement
// Remove udo group
let newContent = content.replace(/<g class="[^"]*region-udo"[^>]*>[\s\S]*?<\/g>/, '');

// Insert udo paths into east group
// We'll find the position right after the east g tag and insert
const eastTag = eastMatch[0];
newContent = newContent.replace(eastTag, eastTag + udoPaths);

fs.writeFileSync(filePath, newContent, 'utf8');
console.log('Successfully merged Udo paths into East group in cctv.html');
