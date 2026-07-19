const fs = require('fs');
global.window = {};
eval(fs.readFileSync('public/assets/curated_festivals.js', 'utf8'));
const festivalCode = fs.readFileSync('src/js/festival.js', 'utf8');
const allTitles = new Set();
for (const month in window.FESTIVAL_DATA.months) {
  window.FESTIVAL_DATA.months[month].forEach(f => allTitles.add(f.title));
}
const missing = [];
for (const title of allTitles) {
  // exact match check in festivalCode
  if (!festivalCode.includes("'" + title + "':") && !festivalCode.includes('"' + title + '":')) {
    missing.push(title);
  }
}
console.log('Total unique titles:', allTitles.size);
console.log('Missing translations count:', missing.length);
console.log('Missing titles:', JSON.stringify(missing, null, 2));
