import urllib.request
import urllib.parse
import re
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

test_list = [
    ("돈사돈 본점", "제주 돈사돈 본점 노형"),
    ("올래국수", "제주 올래국수 연동"),
    ("노형수퍼마켙", "노형수퍼마켙"),
    ("에스프레소라운지", "에스프레소 라운지 노형"),
    ("수목원테마파크", "제주 수목원테마파크"),
    ("도두요트", "메이제주요트"),
    ("그랑블루요트", "도두요트"),
    ("산지물 신제주점", "산지물 신제주점"),
    ("산지물 본점", "산지물 본점"),
    ("동도원", "제주 동도원 연동"),
    ("모살물", "제주 모살물"), # Note: 모살물 is in local.csv, so exclude
    ("어마장장", "어마장장"),
    ("그라나다", "카페 그라나다 도두"),
    ("동문재래시장", "제주 동문재래시장"),
    ("도두동 무지개해안도로", "도두동 무지개해안도로")
]

headers = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
}

for name, q in test_list:
    url = f"https://m.search.naver.com/search.naver?query={urllib.parse.quote(q)}"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode('utf-8')
    except Exception as e:
        print(f"{name}: error {e}")
        continue

    links = re.findall(r'https?://m\.place\.naver\.com/(restaurant|attraction|place)/(\d+)', html)
    if not links:
        print(f"{name}: no links")
        continue

    target_type, target_id = links[0]
    p_url = f"https://m.place.naver.com/{target_type}/{target_id}/home"

    req2 = urllib.request.Request(p_url, headers=headers)
    try:
        with urllib.request.urlopen(req2, timeout=10) as resp2:
            html2 = resp2.read().decode('utf-8')
    except Exception as e:
        print(f"{name}: place error {e}")
        continue

    m = re.search(r'window\.__APOLLO_STATE__\s*=\s*(\{.*?\});\s*window\.__', html2, re.DOTALL)
    if not m:
        m = re.search(r'window\.__APOLLO_STATE__\s*=\s*(\{.*?\});', html2, re.DOTALL)

    pname, r_addr, revs = "", "", ""
    if m:
        try:
            data = json.loads(m.group(1))
            for k, v in data.items():
                if isinstance(v, dict):
                    if 'name' in v and ('roadAddress' in v or 'address' in v or 'visitorReviewsTotal' in v):
                        pname = v.get('name')
                        r_addr = v.get('roadAddress') or v.get('address')
                        revs = v.get('visitorReviewsTotal') or v.get('visitorReviewCount')
                        break
        except:
            pass

    print(f"[{name}] -> {pname} | rev: {revs} | addr: {r_addr} | url: {p_url}")
