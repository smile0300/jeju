import urllib.request
import re
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

# List of all candidate URLs to verify
urls = [
    # 관광지
    ("소천지", "https://m.place.naver.com/place/1196006105/home"),
    ("고근산", "https://m.place.naver.com/attraction/11491304/home"),
    ("제지기오름", "https://m.place.naver.com/attraction/17056198/home"),
    ("서귀포칠십리시공원", "https://m.place.naver.com/attraction/17054113/home"),
    ("엉또폭포", "https://m.place.naver.com/attraction/13491671/home"),
    ("베릿네오름", "https://m.place.naver.com/attraction/31298785/home"),
    ("논짓물해변", "https://m.place.naver.com/place/2141693616/home"),
    ("속골유원지", "https://m.place.naver.com/place/38448226/home"),
    
    # 식당
    ("풍로 중문점", "https://m.place.naver.com/restaurant/1777859545/home"),
    ("꽃돼지연탄구이", "https://m.place.naver.com/restaurant/1759470568/home"),
    ("어진이네 횟집", "https://m.place.naver.com/restaurant/1931182602/home"),
    ("중문 대포동산횟집", "https://m.place.naver.com/restaurant/11713853/home"),
    ("만족한상회 중문점", "https://m.place.naver.com/restaurant/1067329506/home"),
    ("제주할망뚝배기", "https://m.place.naver.com/restaurant/13029486/home"),
    ("중문보말칼국수", "https://m.place.naver.com/restaurant/1173076105/home"),
    ("몰질식육식당", "https://m.place.naver.com/restaurant/16930405/home"),
    ("아서원", "https://m.place.naver.com/restaurant/16921320/home"),
    ("자연스러운식당", "https://m.place.naver.com/restaurant/1041364852/home"),

    # 카페
    ("베케", "https://m.place.naver.com/place/1986557769/home"),
    ("볼스카페", "https://m.place.naver.com/restaurant/1759655013/home"),
    ("서홍정원", "https://m.place.naver.com/restaurant/442257244/home"),
    ("게우지코지 카페", "https://m.place.naver.com/restaurant/536844320/home"),
    ("오버더윈도우", "https://m.place.naver.com/restaurant/38310210/home"),
    ("와랑와랑", "https://m.place.naver.com/restaurant/31519899/home"),
    ("카페숑", "https://m.place.naver.com/restaurant/21608177/home"),
    ("베메로 bake make roast", "https://m.place.naver.com/restaurant/47928097/home"),

    # 체험
    ("그랑블루요트투어", "https://m.place.naver.com/attraction/39584494/home"),
    ("제주서핑스쿨", "https://m.place.naver.com/place/35272239/home"),
    ("옷귀마테마타운", "https://m.place.naver.com/place/36377192/home"),
    ("세리월드카트체험", "https://m.place.naver.com/place/19655252/home"),
    ("버블탱크 스쿠버다이빙", "https://m.place.naver.com/place/38015278/home"),
    ("쇠소깍 산물 관광농원", "https://m.place.naver.com/place/1477312816/home"),
    ("향수공방 미띠뽀", "https://m.place.naver.com/place/1153184426/home"),
    ("무드우드 족욕카페", "https://m.place.naver.com/place/1685500874/home"),

    # 비 오는 날
    ("기당미술관", "https://m.place.naver.com/attraction/11797250/home"),
    ("왈종 미술관", "https://m.place.naver.com/attraction/32323100/home"),
    ("라바북스", "https://m.place.naver.com/attraction/36883511/home"),
    ("서귀포매일올레시장", "https://m.place.naver.com/attraction/13571992/home")
]

headers = {'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)'}

results = []
for label, url in urls:
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode('utf-8')
    except Exception as e:
        results.append({"label": label, "url": url, "error": str(e)})
        continue

    m = re.search(r'window\.__APOLLO_STATE__\s*=\s*(\{.*?\});', html, re.DOTALL)
    if not m:
        results.append({"label": label, "url": url, "error": "no apollo state"})
        continue

    try:
        data = json.loads(m.group(1))
    except Exception as e:
        results.append({"label": label, "url": url, "error": str(e)})
        continue

    found = False
    for k, v in data.items():
        if isinstance(v, dict) and 'name' in v and ('roadAddress' in v or 'address' in v):
            rev = v.get('visitorReviewsTotal') or v.get('visitorReviewCount') or 0
            results.append({
                "label": label,
                "name": v.get('name'),
                "roadAddress": v.get('roadAddress'),
                "address": v.get('address'),
                "category": v.get('category'),
                "visitorReviews": rev,
                "phone": v.get('phone') or v.get('virtualPhone'),
                "isBooking": v.get('isBooking'),
                "bookingUrl": v.get('bookingUrl'),
                "url": url
            })
            found = True
            break
    if not found:
        results.append({"label": label, "url": url, "error": "place object not found"})

import os
os.makedirs(".tmp", exist_ok=True)
with open(".tmp/verified_places.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print(f"Total checked: {len(results)}")
for r in results:
    err = r.get("error")
    if err:
        print(f"[FAIL] {r.get('label')}: {err}")
    else:
        print(f"[OK] {r.get('name')} | {r.get('roadAddress') or r.get('address')} | 리뷰: {r.get('visitorReviews')} | 예약: {r.get('isBooking') or bool(r.get('bookingUrl'))}")
