import urllib.request
import urllib.parse
import re
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

candidates = [
    "서귀포 카페 숑",
    "서귀포 카페 시시소소",
    "서귀포 꼬라지오",
    "서귀포 그레이그로드",
    "서귀포 카페 세렌디",
    "서귀포 블라제",
    "서귀포 감성카페 보목포로",
    "남원 그리울땐제주",
    "남원 카페 서연의집"
]

headers = {'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)'}

for c in candidates:
    url = f"https://m.search.naver.com/search.naver?query={urllib.parse.quote(c)}"
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=5) as resp:
            html = resp.read().decode('utf-8')
        links = re.findall(r'm\.place\.naver\.com/(restaurant|attraction|place)/(\d+)', html)
        if links:
            ptype, pid = links[0]
            durl = f"https://m.place.naver.com/{ptype}/{pid}/home"
            dreq = urllib.request.Request(durl, headers=headers)
            with urllib.request.urlopen(dreq, timeout=5) as dresp:
                dhtml = dresp.read().decode('utf-8')
            m = re.search(r'window\.__APOLLO_STATE__\s*=\s*(\{.*?\});', dhtml, re.DOTALL)
            if m:
                data = json.loads(m.group(1))
                for k, v in data.items():
                    if isinstance(v, dict) and 'name' in v and ('roadAddress' in v or 'address' in v):
                        print(f"FOUND: {c} -> {v.get('name')} | {v.get('roadAddress') or v.get('address')} | 리뷰: {v.get('visitorReviewsTotal') or v.get('visitorReviewCount')} | {durl}")
                        break
    except Exception as e:
        print(f"ERR: {c} -> {e}")
