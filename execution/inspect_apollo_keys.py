import urllib.request
import re
import json
import sys

sys.stdout.reconfigure(encoding="utf-8")
headers = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
}

def inspect_place(ptype, pid):
    url = f"https://m.place.naver.com/{ptype}/{pid}/home"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=10) as resp:
        html = resp.read().decode('utf-8')
    m = re.search(r'window\.__APOLLO_STATE__\s*=\s*(\{.*?\});', html, re.DOTALL)
    if not m:
        print(f"[{pid}] No Apollo state found")
        return
    data = json.loads(m.group(1))
    print(f"[{pid}] Apollo keys count:", len(data.keys()))
    for k, v in data.items():
        if isinstance(v, dict):
            # check if v has name and visitor reviews
            if 'name' in v and ('roadAddress' in v or 'address' in v or 'category' in v or 'visitorReviewsTotal' in v or 'visitorReviewCount' in v):
                print(f"Match in {k}:")
                for subk in ['name', 'category', 'roadAddress', 'address', 'visitorReviewsTotal', 'visitorReviewCount', 'bookingUrl', 'isBooking', 'phone']:
                    print(f"  {subk}: {v.get(subk)}")

inspect_place("attraction", "30811752")
inspect_place("restaurant", "11840561")
