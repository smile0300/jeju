import requests
import re
import json

def extract_cctv_data():
    url = "https://www.jejuits.go.kr/jido/mainView.do?DEVICE_KIND=CCTV"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        html = response.text
        
        # Look for JSON-like data in script tags
        # Often it's in a variable like var cctvList or similar.
        # Let's search for patterns like { ... "cctvId" : "..." ... }
        
        # Based on the read_url_content output, there are list items.
        # Let's try to find the script that handles the marker creation or list rendering.
        
        # Temporary: Print part of the HTML to see the structure if needed
        # But I'll try to find common patterns first.
        
        # Patterns to look for:
        # 1. var data = [...]
        # 2. obj.cctvName = '...'
        
        # Let's search for "cctvId" or "cctvName" in the HTML
        matches = re.finditer(r'\{[^{}]*"cctvId"[^{}]*\}', html)
        cctvs = []
        for match in matches:
            try:
                # Clean up if it's not perfect JSON
                item_text = match.group(0)
                # Convert single quotes to double quotes if necessary
                item_text = item_text.replace("'", '"')
                item = json.loads(item_text)
                cctvs.append(item)
            except:
                continue
                
        if not cctvs:
            # Try searching for a different pattern if the above fails
            # Maybe it's in a JS file? No, usually it's in the main HTML for ease of mapping.
            
            # Let's print the first 2000 characters of <script> blocks to investigate
            scripts = re.findall(r'<script.*?>([\s\S]*?)<\/script>', html)
            for i, script in enumerate(scripts):
                if "cctv" in script.lower():
                    print(f"--- Script Block {i} ---")
                    print(script[:1000]) # Print snippet
        
        return cctvs

    except Exception as e:
        print(f"Error: {e}")
        return []

if __name__ == "__main__":
    data = extract_cctv_data()
    if data:
        print(f"Extracted {len(data)} items.")
        with open("cctv_data.json", "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    else:
        print("No data extracted. Check the script blocks output.")
