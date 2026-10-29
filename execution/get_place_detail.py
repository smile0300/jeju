import urllib.request
import urllib.parse
import json
import re
import sys

def get_place_detail(place_type, place_id):
    url = f"https://m.place.naver.com/{place_type}/{place_id}/home"
    headers = {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode('utf-8')
    except Exception as e:
        return {"error": str(e)}

    # Title
    title = ""
    title_m = re.search(r'<title>([^<]+)</title>', html)
    if title_m:
        title = title_m.group(1).replace(" : 네이버 플레이스", "").strip()

    # Address
    addr = ""
    addr_m = re.search(r'"roadAddress":"([^"]+)"', html)
    if not addr_m:
        addr_m = re.search(r'"address":"([^"]+)"', html)
    if addr_m:
        addr = addr_m.group(1)

    # Visitor Review Count
    v_rev = ""
    v_m = re.search(r'"visitorReviewsScore":[^,]*,"visitorReviewsTotal":(\d+)', html)
    if not v_m:
        v_m = re.search(r'"visitorReviewCount":(\d+)', html)
    if not v_m:
        v_m = re.search(r'방문자리뷰\s*<em>([0-9,]+)</em>', html)
        if v_m:
            v_rev = v_m.group(1).replace(",", "")
    if v_m and not v_rev:
        v_rev = v_m.group(1)

    # Category
    cat = ""
    cat_m = re.search(r'"category":"([^"]+)"', html)
    if cat_m:
        cat = cat_m.group(1)

    return {
        "title": title,
        "address": addr,
        "category": cat,
        "visitor_reviews": v_rev,
        "url": url
    }

if __name__ == "__main__":
    t = sys.argv[1] if len(sys.argv) > 1 else "place"
    i = sys.argv[2] if len(sys.argv) > 2 else "1316592431"
    res = get_place_detail(t, i)
    print(json.dumps(res, ensure_ascii=False, indent=2))
