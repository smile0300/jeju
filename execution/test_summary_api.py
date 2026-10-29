import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding="utf-8")
headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

pids = ["30811752", "1795965442", "1127838540", "11840561", "11866447", "11616005", "13491801"]
for pid in pids:
    url = f"https://map.naver.com/p/api/place/summary/{pid}"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(pid, "->", data.get("name"), "|", data.get("category"), "|", data.get("roadAddress"), "| rev:", data.get("visitorReviewCount"))
    except Exception as e:
        print(pid, "err", e)
