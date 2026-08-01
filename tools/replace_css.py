import re

with open('src/css/components.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Replace .view-toggle-container
container_pattern = re.compile(r'\.view-toggle-container\s*\{.*?\n\}', re.DOTALL)
new_container = '''.view-toggle-container {
    display: flex;
    gap: 0;
    background: var(--fill-secondary);
    padding: 0;
    border-radius: 20px 20px 0 0;
    width: 100%;
    margin-top: 12px;
    margin-bottom: 0;
    border: 1px solid #e5e7eb;
    border-bottom: none;
}'''
css = container_pattern.sub(new_container, css)

# Replace .view-toggle-btn
btn_pattern = re.compile(r'\.view-toggle-btn\s*\{.*?\n\}', re.DOTALL)
new_btn = '''.view-toggle-btn {
    flex: 1;
    border: none;
    background: transparent;
    min-height: var(--touch-target);
    padding: 12px 10px;
    border-radius: 20px 20px 0 0;
    font-size: 0.95rem;
    font-weight: 500;
    color: var(--label-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    white-space: nowrap;
    word-break: keep-all;
}'''
css = btn_pattern.sub(new_btn, css)

# Replace .view-toggle-btn.active
active_pattern = re.compile(r'\.view-toggle-btn\.active\s*\{.*?\n\}', re.DOTALL)
new_active = '''.view-toggle-btn.active {
    background: var(--bg-primary);
    color: var(--label-primary);
    font-weight: 700;
    box-shadow: none;
}'''
css = active_pattern.sub(new_active, css)

with open('src/css/components.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("Replaced CSS successfully")
