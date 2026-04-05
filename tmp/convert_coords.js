const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'src', 'js', 'config.js');
let content = fs.readFileSync(configPath, 'utf8');

const MIN_LON = 126.161; // Gosan
const MAX_LON = 126.938; // Seongsan
const MAP_X_MIN = 880;   
const MAP_X_MAX = 2950;  

const MIN_LAT = 33.242;  // Seogwipo
const MAX_LAT = 33.516;  // Yongduam
const MAP_Y_MIN = 1580;  // bottom
const MAP_Y_MAX = 600;   // top

content = content.replace(/x:\s*(\d+),\s*y:\s*(\d+)/g, (match, p1, p2) => {
    const x = parseInt(p1, 10);
    const y = parseInt(p2, 10);
    
    // Inverse math
    const lon = MIN_LON + ((x - MAP_X_MIN) / (MAP_X_MAX - MAP_X_MIN)) * (MAX_LON - MIN_LON);
    const lat = MIN_LAT - ((y - MAP_Y_MIN) / (MAP_Y_MIN - MAP_Y_MAX)) * (MAX_LAT - MIN_LAT);
    
    // Format to 5 decimal places
    return `lat: ${lat.toFixed(5)}, lon: ${lon.toFixed(5)}`;
});

fs.writeFileSync(configPath, content, 'utf8');
console.log('Successfully updated config.js with lat/lon');
