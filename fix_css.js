const fs = require('fs');
const file = 'c:/jeju-live/src/css/sections.css';
let content = fs.readFileSync(file, 'utf8');

const marker = '/* ===== Home Tagline ===== */';
const idx = content.indexOf(marker);

if (idx !== -1) {
    const endIdx = content.indexOf('}', idx) + 1;
    let cleanContent = content.substring(0, endIdx) + '\n\n';
    
    const newCss = `/* ===== Progressive Disclosure Lost Form ===== */
.progressive-form {
    display: flex;
    flex-direction: column;
}

.progress-container {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
}

.progress-dot {
    flex: 1;
    height: 4px;
    background: #eee;
    border-radius: 2px;
    transition: background-color 0.3s;
}

.progress-dot.active {
    background: var(--color-orange, #ff6b00);
}

.progress-dot.done {
    background: var(--color-orange, #ff6b00);
    opacity: 0.5;
}

.lost-step {
    display: none;
    animation: fadeIn 0.3s ease;
}

.lost-step.active {
    display: block;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

.step-title {
    font-size: 1.2rem;
    font-weight: bold;
    margin-bottom: 5px;
    color: var(--text-primary);
}

.step-desc {
    font-size: 0.9rem;
    color: var(--label-secondary);
    margin-bottom: 20px;
    line-height: 1.4;
}

/* Chips */
.chip-group {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 20px;
}

.lost-chip {
    padding: 10px 16px;
    border: 1px solid var(--separator);
    border-radius: 20px;
    font-size: 0.95rem;
    color: var(--label-secondary);
    background: var(--bg-primary);
    cursor: pointer;
    transition: all 0.2s;
    outline: none;
}

.lost-chip:hover {
    background: var(--bg-secondary);
}

.lost-chip.active {
    background: #fff0e6;
    border-color: var(--color-orange, #ff6b00);
    color: var(--color-orange, #ff6b00);
    font-weight: bold;
}

/* Sub-fields */
.sub-fields {
    display: none;
    background: var(--bg-secondary, #fafafa);
    padding: 15px;
    border-radius: 8px;
    border: 1px solid var(--separator);
    margin-bottom: 20px;
}

.sub-fields.active {
    display: block;
    animation: slideDown 0.3s ease;
}

@keyframes slideDown {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
}

.step-actions {
    position: sticky;
    bottom: 0;
    background: var(--bg-primary);
    padding: 12px 0 4px;
    margin-top: 16px;
    z-index: 1;
    box-shadow: 0 -4px 12px rgba(0,0,0,0.05);
    display: flex;
    gap: 10px;
    justify-content: center;
}
`;
    cleanContent += newCss;
    
    // Fix any potential BOM issue from Powershell
    if (cleanContent.charCodeAt(0) === 0xFEFF) {
        cleanContent = cleanContent.substring(1);
    }
    
    fs.writeFileSync(file, cleanContent, 'utf8');
    console.log('CSS fixed and appended.');
} else {
    console.log('Marker not found.');
}
