import re

file_path = r'c:\jeju-live\src\parts\cctv.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Tabs
old_tabs = '<div class="cctv-tabs"><button class="tab-btn active" onclick="filterByRegion(\'all\')">全部</button><button class="tab-btn" onclick="filterByRegion(\'jeju\')">济州市</button><button class="tab-btn" onclick="filterByRegion(\'seogwipo\')">西归浦市</button><button class="tab-btn" onclick="filterByRegion(\'east\')">东部</button><button class="tab-btn" onclick="filterByRegion(\'west\')">西部</button><button class="tab-btn" onclick="filterByRegion(\'hallasan\')">汉拿山</button></div>'
new_tabs = '<div class="cctv-tabs"><button class="tab-btn active" data-region="all" onclick="filterByRegion(\'all\')">全部</button><button class="tab-btn" data-region="jeju" onclick="filterByRegion(\'jeju\')">济州市</button><button class="tab-btn" data-region="seogwipo" onclick="filterByRegion(\'seogwipo\')">西归浦市</button><button class="tab-btn" data-region="east" onclick="filterByRegion(\'east\')">东部</button><button class="tab-btn" data-region="west" onclick="filterByRegion(\'west\')">西部</button><button class="tab-btn" data-region="hallasan" onclick="filterByRegion(\'hallasan\')">汉拿山</button></div>'

if old_tabs in content:
    content = content.replace(old_tabs, new_tabs)
    print("Tabs updated.")
else:
    print("Tabs not found exactly. Checking for variants...")
    # fallback for East label variants
    content = re.sub(r'<button class="tab-btn" onclick="filterByRegion\(\'east\'\)">东[部부]</button>', 
                     '<button class="tab-btn" data-region="east" onclick="filterByRegion(\'east\')">东部</button>', content)
    # manual update for others if needed... but let's try strict first.

# 2. Move Path
# Target path starts with M2715.3,1127.3
path_pattern = r'(<path d="M2715\.3,1127\.3.+?" />)'
match = re.search(path_pattern, content)

if match:
    path_to_move = match.group(1)
    # Remove from udo group
    content = content.replace(path_to_move, '')
    
    # Insert into east group (assuming it ends with </g>)
    # We find the <g ... region-east ...> and its closing </g>
    # Since it's a one-liner, we look for the pattern: <g class="jeju-region region-east" ...> ... </g>
    east_group_match = re.search(r'(<g class="jeju-region region-east".+?</g>)', content)
    if east_group_match:
        old_east_group = east_group_match.group(1)
        new_east_group = old_east_group.replace('</g>', path_to_move + '</g>')
        content = content.replace(old_east_group, new_east_group)
        print("Path moved to East region.")
    else:
        print("East region group not found.")
else:
    print("Path to move not found.")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Finish.")
