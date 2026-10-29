import urllib.request
import urllib.parse
import json
import re
import sys

def search_naver_place(query):
    url = f"https://m.search.naver.com/search.naver?query={urllib.parse.quote(query)}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode('utf-8')
    except Exception as e:
        return {"error": str(e)}

    # Place IDs and URLs
    place_links = re.findall(r'https?://m\.place\.naver\.com/(restaurant|attraction|place)/(\d+)', html)
    
    # Review counts
    visitor_reviews = re.findall(r'방문자리뷰\s*<em[^>]*>([0-9,]+)</em>', html)
    if not visitor_reviews:
        visitor_reviews = re.findall(r'방문자리뷰</span>\s*<span[^>]*>([0-9,]+)</span>', html)
    if not visitor_reviews:
        visitor_reviews = re.findall(r'방문자리뷰\s*([0-9,]+)', html)

    # Address
    address_match = re.findall(r'class="[a-zA-Z0-9_]*addr[a-zA-Z0-9_]*"[^>]*>([^<]+)<', html)
    if not address_match:
        address_match = re.findall(r'class="[a-zA-Z0-9_]*address[a-zA-Z0-9_]*"[^>]*>([^<]+)<', html)

    # Title / Name
    name_match = re.findall(r'class="[a-zA-Z0-9_]*name[a-zA-Z0-9_]*"[^>]*>([^<]+)<', html)

    return {
        "query": query,
        "place_links": list(set(place_links)),
        "visitor_reviews": visitor_reviews,
        "addresses": address_match,
        "names": name_match
    }

if __name__ == "__main__":
    q = sys.argv[1] if len(sys.argv) > 1 else "서귀포 소천지"
    res = search_naver_place(q)
    print(json.dumps(res, ensure_ascii=False, indent=2))
