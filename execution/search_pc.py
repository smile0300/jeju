import urllib.request
import urllib.parse
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

q = sys.argv[1] if len(sys.argv) > 1 else "바다바라 제주"
url = f"https://search.naver.com/search.naver?query={urllib.parse.quote(q)}"
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req) as resp:
    html = resp.read().decode('utf-8')

# Find place links or ids
p_ids = re.findall(r'data-cid="(\d+)"', html)
print("Data CIDs:", p_ids)
links = re.findall(r'https?://(?:map|place)\.naver\.com/[^\s"\'<>]+', html)
print("Links:", list(set(links))[:5])
links_m = re.findall(r'https?://m\.place\.naver\.com/(?:restaurant|attraction|place)/(\d+)', html)
print("Mobile links:", list(set(links_m))[:5])
