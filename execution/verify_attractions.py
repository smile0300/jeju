import urllib.request
import re
import json
import sys

sys.stdout.reconfigure(encoding="utf-8")
headers = {'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'}

attractions = [
    ("용두암", "attraction", "13491801"),
    ("이호테우해수욕장", "attraction", "11491767"),
    ("도두봉", "place", "13481038"),
    ("도두동무지개해안도로", "attraction", "1037809518"),
    ("삼양해수욕장", "attraction", "13491607"),
    ("사라봉", "attraction", "16986939"),
    ("한라수목원", "attraction", "11607760"),
    ("제주목관아", "attraction", "13345161"),
    ("삼성혈", "attraction", "917337890"),
    ("용연구름다리", "attraction", "17099516")
]

for name, ptype, pid in attractions:
    url = f"https://m.place.naver.com/{ptype}/{pid}/home"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode('utf-8')
        m = re.search(r'window\.__APOLLO_STATE__\s*=\s*(\{.*?\});', html, re.DOTALL)
        if m:
            data = json.loads(m.group(1))
            k = f"PlaceDetailBase:{pid}"
            if k in data:
                v = data[k]
                print(f"[{name}] {v.get('name')} | addr: {v.get('roadAddress') or v.get('address')} | rev: {v.get('visitorReviewsTotal')} | url: {url}")
            else:
                # search any
                for dk, dv in data.items():
                    if isinstance(dv, dict) and 'visitorReviewsTotal' in dv and dv.get('visitorReviewsTotal') is not None:
                        print(f"[{name}] (alt) rev: {dv.get('visitorReviewsTotal')} | url: {url}")
                        break
    except Exception as e:
        print(f"[{name}] err {e}")
