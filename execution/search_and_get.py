import urllib.request
import urllib.parse
import re
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

def search_and_get_details(query):
    # Search on Naver mobile
    search_url = f"https://m.search.naver.com/search.naver?query={urllib.parse.quote(query)}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
    }
    req = urllib.request.Request(search_url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode('utf-8')
    except Exception as e:
        return {"error": f"Search failed: {e}"}

    # Find place links: (restaurant|attraction|place)/(\d+)
    links = re.findall(r'https?://m\.place\.naver\.com/(restaurant|attraction|place)/(\d+)', html)
    if not links:
        # try without domain
        links = re.findall(r'/(restaurant|attraction|place)/(\d+)', html)

    if not links:
        return {"error": f"No place link found for query: {query}"}

    # Pick the first distinct links
    candidates = []
    seen = set()
    for ptype, pid in links:
        if pid not in seen:
            seen.add(pid)
            candidates.append((ptype, pid))
        if len(candidates) >= 3:
            break

    results = []
    for ptype, pid in candidates:
        detail_url = f"https://m.place.naver.com/{ptype}/{pid}/home"
        try:
            d_req = urllib.request.Request(detail_url, headers=headers)
            with urllib.request.urlopen(d_req, timeout=10) as d_resp:
                d_html = d_resp.read().decode('utf-8')
        except Exception as e:
            continue

        m = re.search(r'window\.__APOLLO_STATE__\s*=\s*(\{.*?\});\s*window\.__', d_html, re.DOTALL)
        if not m:
            m = re.search(r'window\.__APOLLO_STATE__\s*=\s*(\{.*?\});', d_html, re.DOTALL)

        if m:
            data = json.loads(m.group(1))
            for k, v in data.items():
                if isinstance(v, dict):
                    if 'name' in v and ('roadAddress' in v or 'address' in v or 'visitorReviewScore' in v or 'visitorReviewsTotal' in v or 'category' in v or 'visitorReviewCount' in v):
                        v_total = v.get('visitorReviewsTotal') or v.get('visitorReviewCount')
                        results.append({
                            "name": v.get('name'),
                            "roadAddress": v.get('roadAddress'),
                            "address": v.get('address'),
                            "category": v.get('category'),
                            "visitorReviewCount": v_total,
                            "phone": v.get('phone') or v.get('virtualPhone'),
                            "bookingUrl": v.get('bookingUrl'),
                            "hasBooking": bool(v.get('bookingUrl') or v.get('isBooking')),
                            "url": detail_url
                        })
                        break

    return {"query": query, "results": results}

if __name__ == "__main__":
    q = sys.argv[1] if len(sys.argv) > 1 else "서귀포 고근산"
    print(json.dumps(search_and_get_details(q), ensure_ascii=False, indent=2))
