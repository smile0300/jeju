const fs = require('fs');

function getCentroid(pathD) {
    const coords = pathD.match(/[-+]?\d*\.\d+|\d+/g);
    if (!coords || coords.length < 2) return { cx: 0, cy: 0 };
    let sumX = 0, sumY = 0, count = 0;
    for (let i = 0; i < coords.length; i += 2) {
        if (coords[i+1]) {
            sumX += parseFloat(coords[i]);
            sumY += parseFloat(coords[i+1]);
            count++;
        }
    }
    return { cx: sumX / count, cy: sumY / count };
}

function processSvg() {
    const svgData = fs.readFileSync('jeju_admin.svg', 'utf8');
    
    // Find all paths using regex
    const pathRegex = /<path[^>]+d="([^"]+)"/g;
    let match;
    const paths = [];

    while ((match = pathRegex.exec(svgData)) !== null) {
        paths.push(match[1]);
    }
    
    const grouped = {
        udo: [],
        hallasan: [],
        jeju: [],
        seogwipo: [],
        east: [],
        west: []
    };

    paths.forEach(d => {
        const { cx, cy } = getCentroid(d);
        let region = "all";

        // Logic based on 3507x2480 viewBox
        // Main Island rough center: 1750, 1240
        if (cx > 2950) {
            region = "udo";
        } else if (cx > 1500 && cx < 2000 && cy > 1000 && cy < 1500) {
            region = "hallasan";
        } else if (cy < 1240) { // North
            if (cx < 1400) region = "west";
            else if (cx > 2100) region = "east";
            else region = "jeju";
        } else { // South
            if (cx < 1400) region = "west";
            else if (cx > 2100) region = "east";
            else region = "seogwipo";
        }

        // Simplify decimals and reduce size
        const simplifiedD = d.replace(/([-+]?\d*\.\d+)/g, (match) => parseFloat(match).toFixed(1));
        
        if (grouped[region]) {
            grouped[region].push(simplifiedD);
        }
    });

    let output = '<!-- Grouped High-Precision Paths -->\n';
    for (const [region, ds] of Object.entries(grouped)) {
        if (ds.length === 0) continue;
        output += `<g class="jeju-region region-${region}" onclick="filterByRegion('${region}')">\n`;
        ds.forEach(d => {
            output += `  <path d="${d}" />\n`;
        });
        output += `</g>\n`;
    }

    fs.writeFileSync('processed_paths.html', output);
    console.log("Processing complete. Saved to processed_paths.html");
}

processSvg();
