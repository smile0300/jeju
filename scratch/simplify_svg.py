import re
import math
import sys

def simplify_path(d_str, tolerance=2.0):
    # Regex to find commands and coordinates
    # This is a basic parser. It assumes standard SVG path commands.
    # Paths in the snippet look like: M1708.7,590.5 L1708.8,590.3 L1709,590 ... Z
    
    tokens = re.findall(r'([a-zA-Z])|([-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?)', d_str)
    
    new_d = []
    last_pt = None
    
    command = ''
    coords = []
    
    def dist(p1, p2):
        if not p1 or not p2: return float('inf')
        return math.hypot(p1[0]-p2[0], p1[1]-p2[1])

    i = 0
    while i < len(tokens):
        t = tokens[i]
        if t[0]: # command
            command = t[0]
            new_d.append(command)
            i += 1
            
            if command.upper() == 'Z':
                last_pt = None
        else:
            # We assume alternating x, y
            if i + 1 < len(tokens) and not tokens[i+1][0]:
                x = float(tokens[i][1])
                y = float(tokens[i+1][1])
                pt = (x, y)
                
                # if distance is less than tolerance, and it's not the first point, skip it
                if last_pt and dist(last_pt, pt) < tolerance and command.upper() == 'L':
                    # Skip point
                    pass
                else:
                    new_d.append(f"{int(round(x))},{int(round(y))}")
                    last_pt = pt
                
                i += 2
            else:
                # Should not happen in standard x,y pairs, but just append
                new_d.append(str(round(float(tokens[i][1]))))
                i += 1

    return " ".join(new_d)

def main():
    file_path = 'src/parts/cctv.html'
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find all path d attributes
    def replacer(match):
        d_attr = match.group(1)
        simplified_d = simplify_path(d_attr, tolerance=3.0) # 3.0 pixel tolerance
        return f'd="{simplified_d}"'

    # Replace d="<huge string>"
    # Use re.sub with a custom function
    new_content = re.sub(r'd="([^"]+)"', replacer, content)

    # Backup original
    import shutil
    shutil.copy2(file_path, file_path + '.bak')

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print(f"Original size: {len(content)}")
    print(f"New size: {len(new_content)}")

if __name__ == '__main__':
    main()
