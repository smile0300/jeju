import urllib.request
import urllib.parse
import re
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

targets = [
    # 식당 10번째 후보
    ("제주할망뚝배기", "서귀포 제주할망뚝배기"),
    ("기정횟집", "서귀포시 서호동 기정횟집"),
    ("강정포구횟집", "서귀포 강정포구횟집"),
    ("다정이네김밥 서귀포본점", "다정이네김밥 서귀포본점"),
    ("테이블앤데스크", "남원 테이블앤데스크"),

    # 카페 6, 7번째 후보
    ("바다바라", "서귀포 바다바라 중문관광로"),
    ("아뜰리에안", "서귀포시 법환동 막숙포로 아뜰리에안"),
    ("와랑와랑", "서귀포 남원 와랑와랑"),
    ("모노클제주", "서귀포 남원 모노클제주"),
    ("하르비커피", "서귀포 칠십리로 115"),

    # 체험 (다도/족욕, 해녀체험)
    ("법환해녀체험", "서귀포 법환 좀녀마을 해녀체험"),
    ("숨도", "서귀포시 일주동로 8941 숨도"),
    ("서귀포 족욕", "서귀포 족욕체험"),
    ("소길다방", "서귀포 다도체험"),

    # 비 오는 날 후보
    ("서귀포매일올레시장", "서귀포매일올레시장"),
    ("감귤박물관", "서귀포 감귤박물관"),
    ("이중섭미술관", "이중섭미술관"),
    ("인터뷰", "남원 인터뷰 서점"),
    ("소암기념관", "서귀포 소암기념관")
]

headers = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
}

def check(tname, query):
    search_url = f"https://m.search.naver.com/search.naver?query={urllib.parse.quote(query)}"
    try:
        req = urllib.request.Request(search_url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode('utf-8')
    except Exception as e:
        return {"tname": tname, "error": str(e)}

    links = re.findall(r'https?://m\.place\.naver\.com/(restaurant|attraction|place)/(\d+)', html)
    if not links:
        links = re.findall(r'/(restaurant|attraction|place)/(\d+)', html)

    candidates = []
    seen = set()
    for ptype, pid in links:
        if pid not in seen:
            seen.add(pid)
            candidates.append((ptype, pid))
        if len(candidates) >= 3:
            break

    for ptype, pid in candidates:
        detail_url = f"https://m.place.naver.com/{ptype}/{pid}/home"
        try:
            d_req = urllib.request.Request(detail_url, headers=headers)
            with urllib.request.urlopen(d_req, timeout=10) as d_resp:
                d_html = d_resp.read().decode('utf-8')
        except Exception:
            continue

        m = re.search(r'window\.__APOLLO_STATE__\s*=\s*(\{.*?\});\s*window\.__', d_html, re.DOTALL)
        if not m:
            m = re.search(r'window\.__APOLLO_STATE__\s*=\s*(\{.*?\});', d_html, re.DOTALL)

        if m:
            try:
                data = json.loads(m.group(1))
            except Exception:
                continue

            for k, v in data.items():
                if isinstance(v, dict):
                    if 'name' in v and ('roadAddress' in v or 'address' in v or 'category' in v or 'visitorReviewScore' in v or 'visitorReviewsTotal' in v or 'visitorReviewCount' in v):
                        v_total = v.get('visitorReviewsTotal') or v.get('visitorReviewCount')
                        # Check business status / closed
                        desc = v.get('description') or ""
                        return {
                            "tname": tname,
                            "name": v.get('name'),
                            "roadAddress": v.get('roadAddress'),
                            "address": v.get('address'),
                            "category": v.get('category'),
                            "visitorReviewCount": v_total,
                            "url": detail_url
                        }
    return {"tname": tname, "error": "not found"}

if __name__ == "__main__":
    for tn, q in targets:
        r = check(tn, q)
        print(f"{tn} -> {r.get('name')} | {r.get('roadAddress') or r.get('address')} | 리뷰: {r.get('visitorReviewCount')} | {r.get('url')}")
