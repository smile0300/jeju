import urllib.request
import re
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

def get_full_place_info(url):
    headers = {'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)'}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        html = resp.read().decode('utf-8')

    m = re.search(r'window\.__APOLLO_STATE__\s*=\s*(\{.*?\});', html, re.DOTALL)
    if not m:
        return {}
    data = json.loads(m.group(1))
    
    info = {}
    for k, v in data.items():
        if isinstance(v, dict) and 'name' in v and ('roadAddress' in v or 'address' in v):
            info['name'] = v.get('name')
            info['category'] = v.get('category')
            info['roadAddress'] = v.get('roadAddress')
            info['address'] = v.get('address')
            info['phone'] = v.get('phone') or v.get('virtualPhone')
            info['visitorReviewsTotal'] = v.get('visitorReviewsTotal') or v.get('visitorReviewCount')
            info['bookingUrl'] = v.get('bookingUrl')
            info['hasBooking'] = bool(v.get('bookingUrl') or v.get('isBooking'))
            info['conveniences'] = v.get('conveniences')
            info['businessHours'] = v.get('businessHours')
            info['options'] = v.get('options')
            break
    return info

if __name__ == "__main__":
    url = sys.argv[1]
    res = get_full_place_info(url)
    print(json.dumps(res, ensure_ascii=False, indent=2))
