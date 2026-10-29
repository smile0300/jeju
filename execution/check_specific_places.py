import urllib.request
import urllib.parse
import re
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

headers = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
}

def find_place(query):
    url = f"https://m.search.naver.com/search.naver?query={urllib.parse.quote(query)}"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=10) as resp:
        html = resp.read().decode('utf-8')

    # Find place/restaurant/attraction links
    links = re.findall(r'https?://m\.place\.naver\.com/(restaurant|attraction|place)/(\d+)', html)
    print(f"Query: {query} -> links found: {links[:3]}")
    for ptype, pid in links[:2]:
        purl = f"https://m.place.naver.com/{ptype}/{pid}/home"
        try:
            req2 = urllib.request.Request(purl, headers=headers)
            with urllib.request.urlopen(req2, timeout=10) as resp2:
                html2 = resp2.read().decode('utf-8')
            m = re.search(r'window\.__APOLLO_STATE__\s*=\s*(\{.*?\});', html2, re.DOTALL)
            if m:
                data = json.loads(m.group(1))
                for k, v in data.items():
                    if isinstance(v, dict) and ('roadAddress' in v or 'address' in v or 'name' in v):
                        name = v.get('name')
                        addr = v.get('roadAddress') or v.get('address')
                        rev = v.get('visitorReviewsTotal') or v.get('visitorReviewCount')
                        print(f"   [{pid}] {name} | {rev} | {addr} | {purl}")
                        break
        except Exception as e:
            print(f"   Error fetching {purl}: {e}")

find_place("제주시 귀아랑길 24 올래국수")
find_place("노형동 에스프레소라운지")
find_place("수목원테마파크 아이스뮤지엄")
find_place("제주고집 제주공항점")
find_place("칠돈가 본점 용담")
find_place("제주 연동 삼보식당")
find_place("미야즈클로젯")
find_place("이호랜드 해양레저")
find_place("제주 홀스랜드 승마체험")
find_place("오라승마")
find_place("동문재래시장 야시장")
