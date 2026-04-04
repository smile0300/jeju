const fs = require('fs');
const path = require('path');

const filePath = path.join('c:', 'jeju-live', 'src', 'parts', 'cctv.html');
let content = fs.readFileSync(filePath, 'utf8');

// replace onclick="filterByRegion('xxx')" with onclick="filterByRegion('xxx', event)"
content = content.replace(/onclick="filterByRegion\('(\w+)'\)"/g, "onclick=\"filterByRegion('$1', event)\"");

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully updated all onclick handlers in cctv.html");
