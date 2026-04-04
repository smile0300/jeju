import os

file_path = r'c:\jeju-live\src\parts\cctv.html'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

target_path_prefix = '  <path d="M2715.3,1127.3'
path_to_move = None
new_lines = []

# 1. 우도 그룹에서 해당 패스 찾기 및 제거
udo_found = False
for line in lines:
    if 'region-udo' in line:
        udo_found = True
    
    if udo_found and line.strip().startswith('<path d="M2715.3,1127.3'):
        path_to_move = line
        continue # Skip this line (remove from udo)
    
    if udo_found and '</g>' in line:
        udo_found = False
        
    new_lines.append(line)

if not path_to_move:
    print("Error: Could not find the target path in udo group.")
    exit(1)

# 2. 동부 그룹에 패스 추가
final_lines = []
east_inserted = False
for line in new_lines:
    final_lines.append(line)
    if 'region-east' in line and not east_inserted:
        final_lines.append(path_to_move)
        east_inserted = True

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(final_lines)

print("Successfully moved path from udo to east.")
