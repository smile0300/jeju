const fs = require('fs');
let html = fs.readFileSync('src/parts/cctv.html', 'utf8');

// The identified culprit: Global Path candidate: x=-13.0, y=1.4, w=1170.8, h=1007.4, pts=6
// starts with M371.0,1008.8 L1157.8,222.1 L1157.8,1.4e-13 L1.9e-

const targetStart = 'M371.0,1008.8 L1157.8,222.1 L1157.8,1.4e-13 L1.9e-';
const regex = new RegExp('<path d="' + targetStart.replace(/\./g, '\\.').replace(/,/g, ',') + '[\\s\\S]*?" />', 'g');

const originalLength = html.length;
html = html.replace(regex, '');

if (html.length < originalLength) {
    console.log("Successfully removed the peach box path.");
} else {
    // Try matching by the bounding box logic more strictly if regex fails
    const pathRegex = /<path d="([\s\S]*?)" \/>/g;
    let match;
    let found = false;
    while ((match = pathRegex.exec(html)) !== null) {
        const d = match[1];
        if (d.includes('M371.0,1008.8')) {
            html = html.replace(match[0], '');
            found = true;
            console.log("Found path by M-coordinate and removed.");
            break;
        }
    }
    if (!found) console.log("Failed to find the path.");
}

fs.writeFileSync('src/parts/cctv.html', html);
