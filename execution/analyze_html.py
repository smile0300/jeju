import urllib.request
import re
import json

url = "https://m.place.naver.com/place/1196006105/home"
headers = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
}
req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req) as resp:
    html = resp.read().decode('utf-8')

print("Length:", len(html))
# Find script with json
scripts = re.findall(r'<script[^>]*>(.*?)</script>', html, re.DOTALL)
for s in scripts:
    if '__APOLLO_STATE__' in s or 'window.__INITIAL_STATE__' in s or 'root' in s:
        print("Found state script, length:", len(s))
        # let's find name, reviewCount, etc.
        m_name = re.findall(r'"name":"([^"]+)"', s)
        print("Names in script:", m_name[:5])
        m_rev = re.findall(r'"visitorReviewCount":(\d+)', s)
        print("Visitor reviews:", m_rev)
        m_addr = re.findall(r'"roadAddress":"([^"]+)"', s)
        print("Road addr:", m_addr)
        m_addr2 = re.findall(r'"address":"([^"]+)"', s)
        print("Addr:", m_addr2)
