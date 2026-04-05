import codecs

with codecs.open('src/parts/cctv.html', 'r', 'utf-8') as f:
    content = f.read()

# 1. Replace Udo shape
udo_start = content.find('<g class="jeju-region region-udo"')
if udo_start != -1:
    udo_end = content.find('</g>', udo_start) + 4
    udo_new = '<g class="jeju-region region-udo" onclick="filterByRegion(\'udo\')"><path d="M3250,520 C3260,500 3290,500 3310,510 C3330,525 3320,560 3300,580 C3280,600 3240,580 3230,560 C3220,540 3240,530 3250,520 Z" /></g>'
    content = content[:udo_start] + udo_new + content[udo_end:]
    print("우도(Udo) 교체 완료")

# 2. Remove Chujado paths
# Chujado is located at y < 350 and we can distinguish it from Udo (x=3250) by x < 3000.
paths = content.split('<path d="M')
new_paths = [paths[0]]
removed = 0

for p in paths[1:]:
    comma_idx = p.find(',')
    space_idx = p.find(' ', comma_idx)
    
    keep = True
    if comma_idx != -1 and space_idx != -1 and comma_idx < 20 and space_idx < 30:
        try:
            x = float(p[:comma_idx])
            y = float(p[comma_idx+1:space_idx])
            
            if y < 350 and x < 3000:
                keep = False
                removed += 1
                # Skip to the end of this path
                end_tag = p.find('/>')
                if end_tag != -1:
                    remaining = p[end_tag+2:]
                    if remaining.strip():
                        # Append any tags that followed this path
                        new_paths[-1] += remaining
        except:
            pass
            
    if keep:
        new_paths.append(p)

final_content = '<path d="M'.join(new_paths)

with codecs.open('src/parts/cctv.html', 'w', 'utf-8') as f:
    f.write(final_content)
    
print("추자도 지우기 완료: 총", removed, "개 경로 삭제")
