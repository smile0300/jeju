import urllib.request
import urllib.parse
import re
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

# List of queries to find exact place URLs
queries = [
    # 관광지
    ("관광지", "용두암", "제주 용두암"),
    ("관광지", "이호테우해수욕장", "이호테우해수욕장"),
    ("관광지", "도두봉", "도두봉 키세스존"),
    ("관광지", "한라수목원", "한라수목원"),
    ("관광지", "삼양해수욕장", "삼양해수욕장"),
    ("관광지", "사라봉", "제주시 사라봉"),
    ("관광지", "제주목관아", "제주목관아"),
    ("관광지", "삼성혈", "제주 삼성혈"),
    ("관광지", "용연구름다리", "용연구름다리"),

    # 식당
    ("식당", "숙성도 노형본점", "숙성도 노형본점"),
    ("식당", "우진해장국", "우진해장국"),
    ("식당", "자매국수", "제주 자매국수"),
    ("식당", "늘봄흑돼지", "제주 늘봄흑돼지"),
    ("식당", "돈사돈 본점", "돈사돈 본점"),
    ("식당", "올래국수", "제주 올래국수"),
    ("식당", "착한집", "제주 착한집"),
    ("식당", "대풍미락", "대풍미락 제주본점"),
    ("식당", "제주마당", "제주마당"),
    ("식당", "순옥이네명가", "순옥이네명가 도두"),
    ("식당", "삼대국수회관 본점", "삼대국수회관 본점"),
    ("식당", "고집돌우럭 제주공항점", "고집돌우럭 제주공항점"),

    # 카페
    ("카페", "빽다방베이커리 제주사수본점", "빽다방베이커리 제주사수본점"),
    ("카페", "앙뚜아네트 용담점", "앙뚜아네트 용담점"),
    ("카페", "에스프레소라운지", "에스프레소라운지 노형"),
    ("카페", "스타벅스 제주용담DT점", "스타벅스 제주용담DT점"),
    ("카페", "카페 진정성 종점", "카페 진정성 종점"),
    ("카페", "듀포레", "듀포레 제주"),
    ("카페", "그러므로 파트투", "그러므로 파트투"),
    ("카페", "드르쿰다 in 공항", "드르쿰다 in 공항"),

    # 체험
    ("체험", "수목원테마파크", "수목원테마파크"),
    ("체험", "도두요트", "도두요트투어"),
    ("체험", "메이제주요트", "메이제주요트"),
    ("체험", "미야즈클로젯", "미야즈클로젯"),
    ("체험", "이호서프", "이호서프"),
    ("체험", "본초족욕 제주", "본초족욕 제주"),

    # 비 오는 날
    ("비오는날", "노형슈퍼마켓", "노형슈퍼마켓"),
    ("비오는날", "넥슨컴퓨터박물관", "넥슨컴퓨터박물관"),
    ("비오는날", "국립제주박물관", "국립제주박물관"),
    ("비오는날", "제주민속자연사박물관", "제주민속자연사박물관"),
    ("비오는날", "제주도립미술관", "제주도립미술관"),
    ("비오는날", "아라리오뮤지엄 탑동시네마", "아라리오뮤지엄 탑동시네마")
]

headers = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
}

def get_exact_place_info(cat, name, q):
    url = f"https://m.search.naver.com/search.naver?query={urllib.parse.quote(q)}"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode('utf-8')
    except Exception as e:
        return {"category": cat, "name": name, "error": str(e)}

    # Match place links
    links = re.findall(r'https?://m\.place\.naver\.com/(restaurant|attraction|place)/(\d+)', html)
    if not links:
        return {"category": cat, "name": name, "error": "No links found"}

    target_type, target_id = links[0]
    place_url = f"https://m.place.naver.com/{target_type}/{target_id}/home"

    # Now fetch place home and parse Apollo state
    req2 = urllib.request.Request(place_url, headers=headers)
    try:
        with urllib.request.urlopen(req2, timeout=10) as resp2:
            html2 = resp2.read().decode('utf-8')
    except Exception as e:
        return {"category": cat, "name": name, "url": place_url, "error": f"Place fetch error: {e}"}

    m = re.search(r'window\.__APOLLO_STATE__\s*=\s*(\{.*?\});\s*window\.__', html2, re.DOTALL)
    if not m:
        m = re.search(r'window\.__APOLLO_STATE__\s*=\s*(\{.*?\});', html2, re.DOTALL)

    res = {
        "category": cat,
        "name": name,
        "type": target_type,
        "id": target_id,
        "url": place_url
    }

    if m:
        try:
            data = json.loads(m.group(1))
            for k, v in data.items():
                if isinstance(v, dict):
                    if 'name' in v and ('roadAddress' in v or 'address' in v or 'visitorReviewsTotal' in v):
                        res['place_name'] = v.get('name')
                        res['roadAddress'] = v.get('roadAddress')
                        res['address'] = v.get('address')
                        res['category_naver'] = v.get('category')
                        res['visitorReviewsTotal'] = v.get('visitorReviewsTotal') or v.get('visitorReviewCount')
                        res['bookingUrl'] = v.get('bookingUrl')
                        res['isBooking'] = v.get('isBooking')
                        res['phone'] = v.get('phone') or v.get('virtualPhone')
                        break
        except Exception as e:
            res['apollo_error'] = str(e)
    else:
        # regex parse
        title_m = re.search(r'<title>([^<]+)</title>', html2)
        if title_m:
            res['place_name'] = title_m.group(1).replace(" : 네이버 플레이스", "").strip()
        v_m = re.search(r'방문자리뷰\s*<em[^>]*>([0-9,]+)</em>', html2)
        if v_m:
            res['visitorReviewsTotal'] = int(v_m.group(1).replace(",", ""))

    return res

if __name__ == "__main__":
    all_data = []
    for cat, name, q in queries:
        info = get_exact_place_info(cat, name, q)
        all_data.append(info)
        print(f"[{info.get('category')}] {info.get('name')} -> {info.get('place_name')} | rev: {info.get('visitorReviewsTotal')} | addr: {info.get('roadAddress') or info.get('address')} | url: {info.get('url')}")

    with open("scratch/north_details.json", "w", encoding="utf-8") as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)
