import urllib.request
import re
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

def parse_place(url):
    headers = {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
    }
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        html = resp.read().decode('utf-8')

    m = re.search(r'window\.__APOLLO_STATE__\s*=\s*(\{.*?\});\s*window\.__', html, re.DOTALL)
    if not m:
        m = re.search(r'window\.__APOLLO_STATE__\s*=\s*(\{.*?\});', html, re.DOTALL)
    
    if m:
        data = json.loads(m.group(1))
        # Find base info
        root_query = data.get('ROOT_QUERY', {})
        res = {}
        for k, v in data.items():
            if isinstance(v, dict):
                if 'name' in v and ('roadAddress' in v or 'address' in v or 'visitorReviewScore' in v or 'visitorReviewsTotal' in v or 'category' in v or 'visitorReviewCount' in v):
                    res['name'] = v.get('name')
                    res['roadAddress'] = v.get('roadAddress')
                    res['address'] = v.get('address')
                    res['category'] = v.get('category')
                    res['visitorReviewCount'] = v.get('visitorReviewCount')
                    res['visitorReviewsTotal'] = v.get('visitorReviewsTotal')
                    res['totalReviewCount'] = v.get('totalReviewCount')
                    res['phone'] = v.get('phone') or v.get('virtualPhone')
                    res['bookingUrl'] = v.get('bookingUrl')
                    res['isBooking'] = v.get('isBooking')
                    res['businessHours'] = v.get('businessHours')
                    break
        return res
    return {}

if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else "https://m.place.naver.com/place/1196006105/home"
    print(json.dumps(parse_place(url), ensure_ascii=False, indent=2))
