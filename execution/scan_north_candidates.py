import urllib.request
import urllib.parse
import re
import json
import sys
import os

# Set UTF-8 encoding for stdout
sys.stdout.reconfigure(encoding='utf-8')

candidates = [
    # 관광지
    ("관광지", "용두암", "제주 용두암"),
    ("관광지", "이호테우해수욕장", "이호테우해수욕장"),
    ("관광지", "도두봉", "도두봉 키세스존"),
    ("관광지", "한라수목원", "한라수목원"),
    ("관광지", "삼양해수욕장", "삼양해수욕장"),
    ("관광지", "사라봉", "제주 사라봉"),
    ("관광지", "제주목관아", "제주목관아"),
    ("관광지", "삼성혈", "제주 삼성혈"),
    ("관광지", "용연구름다리", "용연구름다리"),
    ("관광지", "동문재래시장", "제주 동문재래시장"),

    # 식당 (대형 3000+)
    ("식당", "숙성도 노형본점", "숙성도 노형본점"),
    ("식당", "우진해장국", "우진해장국"),
    ("식당", "자매국수", "자매국수"),
    ("식당", "올래국수", "올래국수"),
    ("식당", "늘봄흑돼지", "늘봄흑돼지"),
    ("식당", "돈사돈 본점", "돈사돈 본점"),
    ("식당", "착한집", "제주 착한집"),
    ("식당", "순옥이네명가", "순옥이네명가 제주"),
    ("식당", "대풍미락", "대풍미락 제주본점"),
    ("식당", "제주마당", "제주마당"),
    ("식당", "삼대국수회관 본점", "삼대국수회관 본점"),
    ("식당", "고집돌우럭 제주공항점", "고집돌우럭 제주공항점"),

    # 카페 (대형 3000+)
    ("카페", "빽다방베이커리 제주사수본점", "빽다방베이커리 제주사수본점"),
    ("카페", "앙뚜아네트 용담점", "앙뚜아네트 용담점"),
    ("카페", "에스프레소라운지", "에스프레소라운지 노형"),
    ("카페", "카페 진정성 종점", "카페 진정성 종점"),
    ("카페", "듀포레", "카페 듀포레 제주"),
    ("카페", "스타벅스 제주용담DT점", "스타벅스 제주용담DT점"),
    ("카페", "그러므로 파트투", "그러므로 파트투"),
    ("카페", "드르쿰다 in 공항", "드르쿰다 in 공항"),

    # 체험 (대형 1000+ or 기업/테마파크/플랫폼 후기)
    ("체험", "수목원테마파크", "수목원테마파크"),
    ("체험", "도두요트", "도두마리나 요트"),
    ("체험", "미야즈클로젯", "미야즈클로젯"),
    ("체험", "이호랜드 해양레저", "이호테우 서핑"),
    ("체험", "제주바다체험장", "제주바다체험장"),
    ("체험", "본초족욕 제주시", "본초족욕 제주"),

    # 비 오는 날 (실내 대형 1시간+)
    ("비오는날", "국립제주박물관", "국립제주박물관"),
    ("비오는날", "노형슈퍼마켓", "노형슈퍼마켓"),
    ("비오는날", "넥슨컴퓨터박물관", "넥슨컴퓨터박물관"),
    ("비오는날", "제주민속자연사박물관", "제주민속자연사박물관"),
    ("비오는날", "제주도립미술관", "제주도립미술관"),
    ("비오는날", "아라리오뮤지엄 탑동시네마", "아라리오뮤지엄 탑동시네마")
]

headers = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
}

def search_candidate(cat, name, query):
    url = f"https://m.search.naver.com/search.naver?query={urllib.parse.quote(query)}"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode('utf-8')
    except Exception as e:
        return {"category": cat, "name": name, "error": str(e)}

    # Place Links
    links = re.findall(r'https?://m\.place\.naver\.com/(restaurant|attraction|place)/(\d+)', html)
    
    # Review counts
    reviews = re.findall(r'방문자리뷰\s*<em[^>]*>([0-9,]+)</em>', html)
    if not reviews:
        reviews = re.findall(r'방문자리뷰\s*([0-9,]+)', html)

    # Address
    address = re.findall(r'class="[a-zA-Z0-9_]*addr[a-zA-Z0-9_]*"[^>]*>([^<]+)<', html)
    if not address:
        address = re.findall(r'class="[a-zA-Z0-9_]*address[a-zA-Z0-9_]*"[^>]*>([^<]+)<', html)

    return {
        "category": cat,
        "name": name,
        "query": query,
        "links": list(set(links))[:3],
        "reviews": reviews[:2],
        "address": address[:2]
    }

if __name__ == "__main__":
    results = []
    for cat, name, q in candidates:
        res = search_candidate(cat, name, q)
        print(f"[{res['category']}] {res['name']}: links={res.get('links')} reviews={res.get('reviews')} addr={res.get('address')}")
        results.append(res)
    with open("scratch/north_scan_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
