import urllib.request
import urllib.parse
import re
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

headers = {'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'}

def check_url(url):
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        html = resp.read().decode('utf-8')
    title_m = re.search(r'<title>([^<]+)</title>', html)
    print("Title:", title_m.group(1) if title_m else "None")
    m = re.search(r'window\.__APOLLO_STATE__\s*=\s*(\{.*?\});', html, re.DOTALL)
    if m:
        data = json.loads(m.group(1))
        for k, v in data.items():
            if isinstance(v, dict) and ('name' in v or 'roadAddress' in v):
                if v.get('name'):
                    print("Name:", v.get('name'))
                    print("Address:", v.get('roadAddress') or v.get('address'))
                    print("Reviews:", v.get('visitorReviewsTotal') or v.get('visitorReviewCount'))
                    print("Category:", v.get('category'))
                    print("Booking:", v.get('bookingUrl'), v.get('isBooking'))
                    print("---")
                    break

print("Checking 30811752 (수목원테마파크):")
check_url("https://m.place.naver.com/attraction/30811752/home")

print("Checking 에스프레소라운지 by address '제주시 한라대학로 1':")
q = urllib.parse.quote("제주시 한라대학로 1 에스프레소라운지")
req = urllib.request.Request(f"https://m.search.naver.com/search.naver?query={q}", headers=headers)
with urllib.request.urlopen(req) as resp:
    html = resp.read().decode('utf-8')
links = re.findall(r'https?://m\.place\.naver\.com/(restaurant|attraction|place)/(\d+)', html)
print("Espresso lounge links:", links)
if links:
    check_url(f"https://m.place.naver.com/{links[0][0]}/{links[0][1]}/home")
