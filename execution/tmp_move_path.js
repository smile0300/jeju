const fs = require('fs');
const path = require('path');

const filePath = path.join('c:', 'jeju-live', 'src', 'parts', 'cctv.html');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

const targetPathPrefix = '<path d="M2715.3,1127.3';
let pathToMove = null;
let newLines = [];

// 1. Find and remove from udo
let udoFound = false;
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('region-udo')) {
        udoFound = true;
    }

    if (udoFound && line.trim().startsWith(targetPathPrefix)) {
        pathToMove = line;
        continue; // Skip this line
    }

    if (udoFound && line.includes('</g>')) {
        udoFound = false;
    }

    newLines.push(line);
}

if (!pathToMove) {
    console.error("Error: Could not find target path in udo group.");
    process.exit(1);
}

// 2. Insert into east
let finalLines = [];
let eastInserted = false;
for (let i = 0; i < newLines.length; i++) {
    const line = newLines[i];
    finalLines.push(line);
    if (line.includes('region-east') && !eastInserted) {
        finalLines.push(pathToMove);
        eastInserted = true;
    }
}

fs.writeFileSync(filePath, finalLines.join('\n'), 'utf8');
console.log("Successfully moved path from udo to east using Node.js");
