import urllib.request
import urllib.parse
import re
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

# 추가 검증 대상
more_candidates = [
    # 식당
    ("식당", "중문 보말칼국수", "서귀포 중문보말칼국수"),
    ("식당", "중문 삼거리식당", "중문 삼거리식당"),
    ("식당", "기정횟집", "서귀포 기정횟집"),
    ("식당", "나룻터식당", "서귀포시 보목동 나룻터식당"),
    ("식당", "아서원", "제주 서귀포 아서원"),
    ("식당", "돈블랙 서귀포본점", "돈블랙 서귀포본점"),
    ("식당", "착한삼촌", "서귀포 착한삼촌"),
    ("식당", "갈치왕 중문점", "갈치왕 중문점"),
    ("식당", "만족한상회 중문점", "만족한상회 중문점"),
    ("식당", "중문 색달식당", "색달식당 중문본점"),
    ("식당", "제주 삼다도횟집 서귀포", "서귀포 삼다도횟집"),
    ("식당", "테이스티제주", "서귀포 테이스티제주"),
    ("식당", "환이네이태리식당", "서귀포 환이네이태리식당"),

    # 카페
    ("카페", "바다바라", "제주 바다바라 중문"),
    ("카페", "아뜰리에안", "서귀포 법환 아뜰리에안"),
    ("카페", "하르비커피", "서귀포 칠십리로 하르비커피"),
    ("카페", "카페 EPL", "남원 카페 EPL"),
    ("카페", "오버더윈도우", "서귀포 오버더윈도우"),
    ("카페", "모차롱", "남원 모차롱"),
    ("카페", "동백포레스트 카페", "동백포레스트"),
    ("카페", "덴드리카페", "서귀포 덴드리"),

    # 체험
    ("체험", "조이다이브", "서귀포 조이다이브"),
    ("체험", "디스커버제주", "디스커버제주"),
    ("체험", "서귀포 문섬 스킨스쿠버", "제주 스킨스쿠버 서귀포 문섬 다이빙"),
    ("체험", "서귀포 향수공방", "서귀포 원데이클래스 향수공방"),
    ("체험", "서귀포 도자기공방", "서귀포 도자기 원데이클래스"),
    ("체험", "제주 가배화원", "서귀포 가배화원"),
    ("체험", "쇠소깍 감귤체험", "서귀포 쇠소깍 귤체험"),
    ("체험", "감귤체험 남원", "제주 남원 감귤따기체험"),
    ("체험", "석부작 숨도", "서귀포 숨도"),

    # 비 오는 날
    ("비오는날", "이중섭미술관", "이중섭미술관 공사 휴관"),
    ("비오는날", "라바르", "서귀포 라바르"),
    ("비오는날", "취향의섬 북앤띵즈", "남원 취향의섬"),
    ("비오는날", "북살롱이마고", "서귀포 북살롱이마고")
]

headers = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
}

def check_one(category_group, target_name, query):
    search_url = f"https://m.search.naver.com/search.naver?query={urllib.parse.quote(query)}"
    try:
        req = urllib.request.Request(search_url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode('utf-8')
    except Exception as e:
        return {"target": target_name, "error": str(e)}

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
                        return {
                            "group": category_group,
                            "target": target_name,
                            "name": v.get('name'),
                            "roadAddress": v.get('roadAddress'),
                            "address": v.get('address'),
                            "category": v.get('category'),
                            "visitorReviewCount": v_total,
                            "phone": v.get('phone') or v.get('virtualPhone'),
                            "url": detail_url
                        }
    return {"group": category_group, "target": target_name, "error": "not found"}

if __name__ == "__main__":
    results = []
    for grp, tgt, q in more_candidates:
        res = check_one(grp, tgt, q)
        print(f"[{grp}] {tgt} -> {res.get('name')} | {res.get('roadAddress') or res.get('address')} | 리뷰: {res.get('visitorReviewCount')} | {res.get('url')}")
        results.append(res)
    
    import os
    os.makedirs(".tmp", exist_ok=True)
    with open(".tmp/more_candidates_temp.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
