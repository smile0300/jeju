import re

with open('src/css/components.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Add overflow: hidden to .view-toggle-container
container_pattern = re.compile(r'(\.view-toggle-container\s*\{[^}]*?)(^\s*\})', re.MULTILINE)
css = container_pattern.sub(r'\1    overflow: hidden;\n\2', css)

# Change border-radius of .view-toggle-btn to 0
btn_pattern = re.compile(r'(\.view-toggle-btn\s*\{[^}]*?)border-radius:\s*20px 20px 0 0;', re.DOTALL)
css = btn_pattern.sub(r'\1border-radius: 0;', css)

with open('src/css/components.css', 'w', encoding='utf-8') as f:
    f.write(css)

with open('src/parts/lost-found.html', 'r', encoding='utf-8') as f:
    html = f.read()

html = html.replace('border-radius: 12px; margin-top: 10px;', 'border-radius: 0 0 12px 12px; margin-top: 0; border-top: 1px solid #e5e7eb;')

with open('src/parts/lost-found.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Updated CSS and HTML")
