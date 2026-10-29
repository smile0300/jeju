import urllib.request
import urllib.parse
import re
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

# Check naver / web for chinese reviews & waiting time for each place
places_to_verify = [
    # 관광지
    "용두암", "도두동무지개해안도로", "이호테우해수욕장", "도두봉 키세스존", "삼양해수욕장", "사라봉", "한라수목원", "제주목관아", "삼성혈",
    # 식당
    "우진해장국", "고집돌우럭 제주공항점", "늘봄흑돼지", "자매국수", "숙성도 제주본점", "올래국수", "착한집 제주", "순옥이네명가",
    # 카페
    "빽다방베이커리 제주사수점", "스타벅스 제주서해안로DT점", "앙뚜아네트 용담", "카페진정성 종점", "듀포레",
    # 체험
    "수목원테마파크", "블루원 요트투어", "어승생승마장", "본초족욕", "이호서프",
    # 비 오는 날
    "노형수퍼마켙", "넥슨컴퓨터박물관", "제주민속자연사박물관", "국립제주박물관"
]

def check_info(name):
    # Check wait time and booking
    q = urllib.parse.quote(f"{name} 웨이팅 대기시간 예약")
    url = f"https://search.naver.com/search.naver?query={q}"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            html = resp.read().decode('utf-8')
        m_catch = "캐치테이블" in html
        m_tabling = "테이블링" in html
        m_naver = "네이버예약" in html or "네이버 예약" in html
        print(f"[{name}] Booking clues: catch={m_catch}, tabling={m_tabling}, naver={m_naver}")
    except Exception as e:
        print(f"[{name}] error {e}")

for p in places_to_verify:
    check_info(p)
