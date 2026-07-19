import re

with open('src/css/sections.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Replace border-radius in .lost-table-container block 1
css = re.sub(r'(\.lost-table-container\s*\{[^}]*?)border-radius:\s*20px;', r'\1border-radius: 0 0 20px 20px;', css, flags=re.DOTALL)

# Replace border-radius in .lost-table-container block 2
css = re.sub(r'(\.lost-table-container\s*\{[^}]*?)border-radius:\s*var\(--radius-xl\);', r'\1border-radius: 0 0 var(--radius-xl) var(--radius-xl);', css, flags=re.DOTALL)

# Also ensure .lost-table-container has margin-top: 0 just in case
# We can append margin-top: 0; to both blocks
css = re.sub(r'(\.lost-table-container\s*\{)', r'\1\n    margin-top: 0;', css, flags=re.DOTALL)

with open('src/css/sections.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("Updated .lost-table-container in sections.css")
