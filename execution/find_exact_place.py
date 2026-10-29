import urllib.request
import urllib.parse
import re
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

q = sys.argv[1] if len(sys.argv) > 1 else "중문관광로72번길 29-51 바다바라"
url = f"https://m.search.naver.com/search.naver?query={urllib.parse.quote(q)}"
headers = {'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)'}
req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req) as resp:
    html = resp.read().decode('utf-8')

# Look for any place links
matches = re.findall(r'(https?://m\.place\.naver\.com/(?:restaurant|attraction|place)/\d+)', html)
if not matches:
    matches = re.findall(r'(/(?:restaurant|attraction|place)/\d+)', html)

print("Found links:", list(set(matches)))
for link in list(set(matches))[:3]:
    if not link.startswith("http"):
        link = "https://m.place.naver.com" + link
    try:
        dreq = urllib.request.Request(link + "/home" if not link.endswith("/home") else link, headers=headers)
        with urllib.request.urlopen(dreq) as dresp:
            dhtml = dresp.read().decode('utf-8')
        t = re.search(r'<title>([^<]+)</title>', dhtml)
        print(link, t.group(1) if t else "")
        rev = re.search(r'"visitorReviewsTotal":(\d+)', dhtml)
        if not rev:
            rev = re.search(r'"visitorReviewCount":(\d+)', dhtml)
        if rev:
            print("Reviews:", rev.group(1))
    except Exception as e:
        print(link, "Error:", e)
