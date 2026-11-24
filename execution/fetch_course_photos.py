"""코스 장소별 사진 받기 (비짓제주 API 대표사진 → 작게 줄인 webp로 직접 호스팅)

  python -I execution/fetch_course_photos.py <stops.json> <작업폴더> [--download]

- stops.json: [{ko, pos:[lat,lng], have}] (사진이 이미 있는 곳은 have=true → 건너뜀)
- 1단계(기본): 비짓제주 관광지·쇼핑·음식점 목록을 받아 장소 이름 + 거리(1.5km 안)로 짝을 찾아 <작업폴더>/match.json 저장
- 2단계(--download): match.json의 사진을 받아 480x360 webp(품질 62)로 public/img/places/<id>.webp 저장,
  src/data/stop-photos.js 생성
- 원본 사진은 작업폴더에만 받고, 저장소에는 줄인 webp만 넣는다 (중국 접속 고려: 외부 이미지 주소를 화면에 쓰지 않음)
"""
import hashlib
import io
import json
import math
import os
import re
import sys
import urllib.request

API = 'https://api.visitjeju.net/vsjApi/contents/searchList'
API_KEY = 'fd0365a6919e44c3b120034ba100678f'  # execution/fetch_to_csv.js 와 같은 공개 키
CATEGORIES = ['c1', 'c2', 'c4']               # 관광지 · 쇼핑 · 음식점(카페 포함)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, 'public', 'img', 'places')
OUT_JS = os.path.join(ROOT, 'src', 'data', 'stop-photos.js')
MAX_KM = 1.5
# 이름이 달라 자동으로 못 찾거나, 대표사진이 엉뚱한 곳 (None = 사진 쓰지 않음)
MANUAL = {
    '천제연폭포': None,                               # 비짓제주 대표사진이 4.3 위령비 계단
    '칠성로 쇼핑거리': '제주칠성로상가',
    '풍림다방 송당': '풍림다방 커피로스터즈 송당',
}


def norm(s):
    s = re.sub(r'\(.*?\)|（.*?）', '', s or '')
    s = re.sub(r'(제주점|본점|점|해수욕장|해변|해안)$', '', s.replace(' ', ''))
    return s.lower()


def km(a, b):
    dy = (a[0] - b[0]) * 111
    dx = (a[1] - b[1]) * 111 * math.cos(math.radians(a[0]))
    return math.hypot(dx, dy)


def fetch_json(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode('utf-8'))


def list_all(work):
    cache = os.path.join(work, 'vj_items.json')
    if os.path.exists(cache):
        return json.load(open(cache, encoding='utf-8'))
    items = []
    for cat in CATEGORIES:
        page = 1
        while True:
            d = fetch_json(f'{API}?apiKey={API_KEY}&locale=kr&category={cat}&page={page}&pageSize=100')
            for it in d.get('items') or []:
                p = (it.get('repPhoto') or {}).get('photoid') or {}
                if not p.get('imgpath'):
                    continue
                items.append({
                    'title': it.get('title') or '', 'cat': cat,
                    'lat': float(it.get('latitude') or 0), 'lng': float(it.get('longitude') or 0),
                    'img': p.get('imgpath'), 'thumb': p.get('thumbnailpath') or '',
                })
            if page >= int(d.get('pageCount') or 1):
                break
            page += 1
    json.dump(items, open(cache, 'w', encoding='utf-8'), ensure_ascii=False)
    return items


def best_match(stop, items):
    n = norm(stop['ko'])
    pos = stop.get('pos')
    cands = []
    for it in items:
        t = norm(it['title'])
        if not t or not n:
            continue
        if t == n:
            score = 0
        elif n in t or t in n:
            score = 1
        else:
            continue
        d = km(pos, (it['lat'], it['lng'])) if pos and it['lat'] else 99
        if d > MAX_KM:
            continue
        cands.append((score, d, it))
    cands.sort(key=lambda c: (c[0], c[1]))
    return cands[0] if cands else None


def step_match(stops, work):
    items = list_all(work)
    out = {}
    for s in stops:
        if s.get('have'):
            continue
        if s['ko'] in MANUAL:
            t = MANUAL[s['ko']]
            hit = next((it for it in items if it['title'] == t), None) if t else None
            out[s['ko']] = hit and {'title': t, 'km': None, 'img': hit['img']}
            continue
        m = best_match(s, items)
        out[s['ko']] = None if not m else {'title': m[2]['title'], 'km': round(m[1], 2), 'img': m[2]['img']}
    json.dump(out, open(os.path.join(work, 'match.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    ok = sum(1 for v in out.values() if v)
    print(f'비짓제주 항목 {len(items)}개 · 짝 찾음 {ok}/{len(out)}')
    for k, v in out.items():
        print(('  OK ' if v else '  -- ') + k + (f'  ←  {v["title"]} ({v["km"]}km)' if v else ''))


def step_download(work):
    from PIL import Image  # 작업폴더 밖(저장소)에서 실행하는 스크립트라 import 경로 안전
    match = json.load(open(os.path.join(work, 'match.json'), encoding='utf-8'))
    os.makedirs(OUT_DIR, exist_ok=True)
    photos = {}
    for name, m in match.items():
        if not m:
            continue
        fid = hashlib.sha1(name.encode('utf-8')).hexdigest()[:10]
        req = urllib.request.Request(m['img'], headers={'User-Agent': 'Mozilla/5.0'})
        try:
            raw = urllib.request.urlopen(req, timeout=60).read()
            im = Image.open(io.BytesIO(raw)).convert('RGB')
        except Exception as e:  # noqa: BLE001
            print('  실패', name, e)
            continue
        # 4:3으로 가운데 잘라 480x360
        w, h = im.size
        tw = min(w, h * 4 / 3)
        th = tw * 3 / 4
        im = im.crop(((w - tw) / 2, (h - th) / 2, (w + tw) / 2, (h + th) / 2)).resize((480, 360), Image.LANCZOS)
        im.save(os.path.join(OUT_DIR, f'{fid}.webp'), 'WEBP', quality=62, method=6)
        photos[name] = f'{fid}.webp'
        print('  저장', name, fid)
    lines = ['// 자동 생성: python -I execution/fetch_course_photos.py … --download — 직접 수정하지 말 것',
             '// 코스 장소별 사진 (비짓제주 대표사진 480x360 webp, public/img/places). 코스 표지 사진(COVERS)과 함께 분할 표지에 쓴다.',
             '', 'export const STOP_PHOTOS = {']
    lines += [f'    {json.dumps(k, ensure_ascii=False)}: {json.dumps(v)},' for k, v in sorted(photos.items())]
    lines += ['};', '']
    open(OUT_JS, 'w', encoding='utf-8', newline='\n').write('\n'.join(lines))
    print(f'{len(photos)}장 저장 → {OUT_JS}')


if __name__ == '__main__':
    stops_path, work = sys.argv[1], sys.argv[2]
    os.makedirs(work, exist_ok=True)
    if '--download' in sys.argv:
        step_download(work)
    else:
        step_match(json.load(open(stops_path, encoding='utf-8')), work)
