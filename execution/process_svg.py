import xml.etree.ElementTree as ET
import re

def get_centroid(path_d):
    # Extract points from d string (very simplified)
    coords = re.findall(r'([-+]?\d*\.\d+|\d+)', path_d)
    if not coords: return (0, 0)
    xs = [float(coords[i]) for i in range(0, len(coords), 2)]
    ys = [float(coords[i+1]) for i in range(0, len(coords), 2)]
    return (sum(xs)/len(xs), sum(ys)/len(ys))

def process_svg(input_file, output_file):
    # Register namespaces to avoid 'ns0' prefixes
    ET.register_namespace('', "http://www.w3.org/2000/svg")
    tree = ET.parse(input_file)
    root = tree.getroot()
    
    # SVG viewBox
    viewbox = root.get('viewBox', '0 0 3507 2480')
    print(f"ViewBox: {viewbox}")
    
    paths = []
    # Find all paths
    for path in root.findall('.//{http://www.w3.org/2000/svg}path'):
        d = path.get('d')
        if not d: continue
        
        centroid = get_centroid(d)
        cx, cy = centroid
        
        # Categorization logic based on 3507x2480 coordinate system
        # Hallasan is in the center (~1750, ~1240)
        # Udo is far East (>3000)
        # Jeju City is North-Central
        # Seogwipo is South-Central
        
        region = "all"
        if cx > 3000: # Udo
            region = "udo"
        elif 1400 < cx < 2100 and 1000 < cy < 1500: # Hallasan/Mountain
            region = "hallasan"
        elif cy < 1240: # North Half
            if cx < 1400: region = "west"
            elif cx > 2100: region = "east"
            else: region = "jeju"
        else: # South Half
            if cx < 1400: region = "west"
            elif cx > 2100: region = "east"
            else: region = "seogwipo"
            
        # Simplify path: reduce decimals to 1 place
        new_d = re.sub(r'([-+]?\d*\.\d+)', lambda m: f"{float(m.group(1)):.1f}", d)
        
        paths.append({
            'region': region,
            'd': new_d
        })

    # Group paths by region
    grouped = {}
    for p in paths:
        r = p['region']
        if r not in grouped: grouped[r] = []
        grouped[r].append(p['d'])
        
    # Generate minimized SVG XML for HTML
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('<!-- Grouped High-Precision Paths -->\n')
        for r, ds in grouped.items():
            f.write(f'<g class="jeju-region region-{r}" onclick="filterByRegion(\'{r}\')">\n')
            for d in ds:
                f.write(f'  <path d="{d}" />\n')
            f.write('</g>\n')

if __name__ == "__main__":
    process_svg('jeju_admin.svg', 'processed_paths.html')
