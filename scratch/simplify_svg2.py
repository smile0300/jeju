import re
import math

def simplify_path(d_str, tolerance=5.0):
    tokens = re.findall(r'([a-zA-Z])|([-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?)', d_str)
    
    new_d = []
    last_pt = None
    
    command = ''
    
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
            if i + 1 < len(tokens) and not tokens[i+1][0]:
                x = float(tokens[i][1])
                y = float(tokens[i+1][1])
                pt = (x, y)
                
                # We do not drop M commands or C commands (though we assume L mostly)
                if last_pt and dist(last_pt, pt) < tolerance and command.upper() == 'L':
                    # Skip point
                    pass
                else:
                    new_d.append(f"{int(round(x))},{int(round(y))}")
                    last_pt = pt
                
                i += 2
            else:
                new_d.append(str(round(float(tokens[i][1]))))
                i += 1

    # Join without spaces where possible
    # Just simple space join, but remove spaces before/after letters
    res = " ".join(new_d)
    res = re.sub(r'\s+([a-zA-Z])', r'\1', res)
    res = re.sub(r'([a-zA-Z])\s+', r'\1', res)
    return res

def main():
    # Use the backup to re-process from the original high-res SVG
    file_path = 'src/parts/cctv.html.bak'
    out_path = 'src/parts/cctv.html'
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    def replacer(match):
        d_attr = match.group(1)
        simplified_d = simplify_path(d_attr, tolerance=5.0)
        return f'd="{simplified_d}"'

    new_content = re.sub(r'd="([^"]+)"', replacer, content)

    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print(f"Original size: {len(content)}")
    print(f"Aggressive new size: {len(new_content)}")

if __name__ == '__main__':
    main()
