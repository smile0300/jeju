import urllib.request
import urllib.parse
import re
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

candidates_to_check = [
    # 관광지
    ("관광지", "제지기오름", "서귀포 제지기오름"),
    ("관광지", "칠십리시공원", "서귀포 칠십리시공원"),
    ("관광지", "엉또폭포", "서귀포 엉또폭포"),
    ("관광지", "베릿내오름", "중문 베릿내오름"),
    ("관광지", "논짓물", "서귀포 논짓물"),
    ("관광지", "속골", "서귀포 속골"),
    ("관광지", "자구리공원", "서귀포 자구리공원"),
    ("관광지", "걸매생태공원", "서귀포 걸매생태공원"),

    # 식당
    ("식당", "풍로 중문점", "풍로 중문점"),
    ("식당", "꽃돼지연탄구이", "서귀포 꽃돼지연탄구이"),
    ("식당", "까망돼지 서귀포점", "까망돼지 서귀포점"),
    ("식당", "어진이네횟집", "서귀포 어진이네횟집"),
    ("식당", "나룻터식당", "서귀포 나룻터식당"),
    ("식당", "대포동산횟집", "중문 대포동산횟집"),
    ("식당", "국수바다본점", "중문 국수바다본점"),
    ("식당", "하선옥보말칼국수", "서귀포 하선옥보말칼국수"),
    ("식당", "몰질식당", "서귀포 몰질식당"),
    ("식당", "자연스런식당", "서귀포 자연스런식당"),
    ("식당", "낭쿰낭쿰", "서귀포 낭쿰낭쿰"),

    # 카페
    ("카페", "베케", "서귀포 베케"),
    ("카페", "볼스카페", "서귀포 볼스카페"),
    ("카페", "바다바라", "중문 바다바라"),
    ("카페", "서홍정원", "서귀포 서홍정원"),
    ("카페", "텐저린", "서귀포 카페 텐저린"),
    ("카페", "게우지코지카페", "서귀포 게우지코지카페"),
    ("카페", "아뜰리에안", "서귀포 아뜰리에안"),
    ("카페", "하르비커피", "서귀포 하르비커피"),

    # 체험
    ("체험", "뉴헤븐다이브", "서귀포 뉴헤븐다이브"),
    ("체험", "그랑블루요트", "중문 그랑블루요트"),
    ("체험", "제주서핑스쿨", "중문 제주서핑스쿨"),
    ("체험", "옷귀마테마타운", "남원 옷귀마테마타운"),
    ("체험", "본초족욕 서귀포", "본초족욕 제주서귀포"),
    ("체험", "세리월드 카트", "서귀포 세리월드 카트"),
    ("체험", "낭만제주은공방", "서귀포 은공방"),
    ("체험", "달콤한농장", "서귀포 감귤체험 달콤한농장"),

    # 비 오는 날
    ("비오는날", "기당미술관", "서귀포 기당미술관"),
    ("비오는날", "왈종미술관", "서귀포 왈종미술관"),
    ("비오는날", "소암기념관", "서귀포 소암기념관"),
    ("비오는날", "라바북스", "남원 라바북스"),
    ("비오는날", "이중섭미술관", "서귀포 이중섭미술관")
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
        if len(candidates) >= 2:
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
    for grp, tgt, q in candidates_to_check:
        res = check_one(grp, tgt, q)
        print(f"[{grp}] {tgt} -> {res.get('name')} | {res.get('roadAddress') or res.get('address')} | 리뷰: {res.get('visitorReviewCount')} | {res.get('url')}")
        results.append(res)
    
    import os
    os.makedirs(".tmp", exist_ok=True)
    with open(".tmp/batch_results_temp.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
