const fs = require('fs');
const path = require('path');

const REAL_COORDS = {
    // Hallasan
    'baenglokdam': { lat: 33.3614, lon: 126.5294 },
    'wang-gwanreung': { lat: 33.3551, lon: 126.5458 },
    'witseoreum': { lat: 33.3592, lon: 126.5057 },
    'eoseungsaengak': { lat: 33.3855, lon: 126.5015 },
    '1100road': { lat: 33.3571, lon: 126.4632 },
    'C_mabangmokji': { lat: 33.4359, lon: 126.6139 },

    // Jeju
    'C10': { lat: 33.4839, lon: 126.4828 },
    'C62': { lat: 33.5041, lon: 126.4950 },
    'C13': { lat: 33.4996, lon: 126.5272 },
    'C54': { lat: 33.4735, lon: 126.4673 },
    'C_yongduam': { lat: 33.5165, lon: 126.5120 },
    'C_ihotewoo': { lat: 33.4984, lon: 126.4552 },
    'C_samyang': { lat: 33.5246, lon: 126.5866 },

    // Seogwipo
    'C_saeyeongyo': { lat: 33.2384, lon: 126.5595 },
    'C_jungmun': { lat: 33.2443, lon: 126.4116 },

    // East
    'W162': { lat: 33.2683, lon: 126.6508 },
    'C41': { lat: 33.2798, lon: 126.7179 },
    'C42': { lat: 33.4357, lon: 126.9080 },
    'C93': { lat: 33.5590, lon: 126.7505 },
    'C72': { lat: 33.4328, lon: 126.6715 },
    'C6_hamdeok': { lat: 33.5434, lon: 126.6698 },
    'C_woljeongri': { lat: 33.5558, lon: 126.7963 },
    'C_seongsan': { lat: 33.4586, lon: 126.9423 },
    'C_pyoseon': { lat: 33.3238, lon: 126.8373 },

    // West
    'C39': { lat: 33.2985, lon: 126.1627 },
    'C58': { lat: 33.3934, lon: 126.2390 },
    'C34': { lat: 33.4795, lon: 126.3768 },
    'C_gwakji': { lat: 33.4502, lon: 126.3051 },
    'C_geumneung': { lat: 33.3898, lon: 126.2369 },
    'C_sanbangsan': { lat: 33.2422, lon: 126.3121 },
    'C_songaksan': { lat: 33.2069, lon: 126.2917 },
    'C_gapado': { lat: 33.1678, lon: 126.2709 },
    'C_marado': { lat: 33.1184, lon: 126.2678 },
    'C_moseulpo': { lat: 33.2185, lon: 126.2513 },

    // Udo
    'C_cheonjin': { lat: 33.5019, lon: 126.9413 },
    'C_haumokdong': { lat: 33.5146, lon: 126.9427 }
};

const configPath = path.join(__dirname, '..', 'src', 'js', 'config.js');
let content = fs.readFileSync(configPath, 'utf8');

// Replace using regex that finds id: '...' and looks ahead for lat, lon
Object.keys(REAL_COORDS).forEach(id => {
    const coords = REAL_COORDS[id];
    const regex = new RegExp(`(id:\\s*'${id}'.*?)lat:\\s*[0-9.]+,(.*?)lon:\\s*[0-9.]+`, 'g');
    content = content.replace(regex, `$1lat: ${coords.lat},$2lon: ${coords.lon}`);
});

fs.writeFileSync(configPath, content, 'utf8');
console.log('Successfully updated config.js with REAL lat/lon');
