import re

file_path = r'c:\jeju-live\src\parts\cctv.html'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find all g tags with region classes
regions = re.findall(r'<g class="[^"]*region-[^"]*"[^>]*>', content)
for r in regions:
    print(r)

# Find specific region-east
east_match = re.search(r'region-east', content)
if east_match:
    print(f"Found 'region-east' at {east_match.start()}")
else:
    print("'region-east' not found")
