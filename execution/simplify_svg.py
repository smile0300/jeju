import re
import os

target_file = r'c:\jeju-live\src\parts\cctv.html'

if not os.path.exists(target_file):
    print(f"Error: {target_file} not found.")
    exit(1)

with open(target_file, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove the background path that covers the entire map
# It's usually something like <path d="M-2,-2 L3510,-2 L3510,2483 L-2,2483 L-2,-2" />
bg_pattern = r'<path d="M-2,-2 L3510,-2 L3510,2483 L-2,2483 L-2,-2" />'
content = re.sub(bg_pattern, '', content)

# 2. Optimize Path Data
def simplify_path(match):
    d = match.group(1)
    # Round numbers to 1 decimal place and remove trailing .0
    def round_coord(m):
        val = float(m.group(0))
        # Keep 1 decimal place
        res = f"{val:.1f}"
        if res.endswith('.0'):
            res = res[:-2]
        return res

    # Find all float/int numbers
    nums = re.sub(r'[-+]?\d*\.\d+|\d+', round_coord, d)
    # Remove redundant spaces around commas or after commands
    nums = re.sub(r'\s+', ' ', nums).strip()
    return f'd="{nums}"'

# Regex for path tag d attribute
# We match d="..."
content = re.sub(r'd="([^"]+)"', simplify_path, content)

# 3. Minify SVG inner whitespace (basic)
# content = re.sub(r'>\s+<', '><', content) # Might be risky if parts depend on spacing

with open(target_file, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Optimization complete for {target_file}")
