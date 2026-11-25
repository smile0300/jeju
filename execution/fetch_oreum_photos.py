"""오름 카드 사진 받기 (노을·포토존·전망 등) → 작게 줄인 webp로 직접 호스팅

  python -I execution/fetch_oreum_photos.py <작업폴더>

- 고른 사진 목록은 아래 PICKS (사람이 사진을 보고 종류를 붙인 것)
  - 'vj:<contentsid 끝 5자리>': 비짓제주 API 대표사진 (fetch_course_photos.py와 같은 공개 키)
  - 'cm:<File:파일명>': 위키미디어 공용 사진 — CC 라이선스라 작가·라이선스를 카드에 표시(c)
- 480x360 webp(품질 62)로 public/img/oreums/<해시>.webp 저장, src/data/oreum-photos.js 생성
- 원본은 작업폴더에만 받는다 (중국 접속 고려: 외부 이미지 주소를 화면에 쓰지 않음)
- 종류(k): sunset 노을 / sunrise 일출 / spot 포토존 / view 전망 / trail 산책로
"""
import hashlib
import io
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, 'public', 'img', 'oreums')
OUT_JS = os.path.join(ROOT, 'src', 'data', 'oreum-photos.js')
VJ_API = 'https://api.visitjeju.net/vsjApi/contents/searchList'
VJ_KEY = 'fd0365a6919e44c3b120034ba100678f'
UA = {'User-Agent': 'jeju-live-photo-fetch/1.0'}

# 카드에 보이는 순서대로. 첫 장이 대표(목록에서 먼저 보임)
PICKS = {
    'dodubong': [('vj:00143', 'spot'), ('vj:07625', 'spot')],
    'sarabong': [('vj:00276', 'view')],
    'byeoldobong': [('vj:00243', 'view')],
    'seoubong': [('vj:00335', 'view')],
    'jimibong': [('vj:00610', 'view')],
    'yongnuni': [('vj:00466', 'sunset')],
    'baekyaki': [('vj:00232', 'view')],
    'udobong': [('vj:22519', 'view'), ('vj:20565', 'spot')],
    'saebyeol': [('vj:00309', 'view')],
    'geum': [('vj:19460', 'view')],
    'songaksan': [('vj:00378', 'view')],
    'suwolbong': [('vj:00388', 'spot'), ('vj:20148', 'trail')],
    'gogeunsan': [('vj:00050', 'trail')],
    'gunsan': [('vj:00068', 'view')],
    'jejigi': [('vj:00586', 'view')],
    'mulyeongari': [('vj:00202', 'view')],
    'sangumburi': [('vj:00283', 'view')],
    'ttarabi': [('vj:00168', 'view')],
    'bulgeun': [('vj:00266', 'view')],
}


def fetch(url, tries=5):
    for k in range(tries):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read()
        except urllib.error.HTTPError as e:
            if e.code != 429:
                raise
            time.sleep(10 * (k + 1))
    raise RuntimeError('429: ' + url)


def vj_index(work):
    cache = os.path.join(work, 'vj_c1.json')
    if os.path.exists(cache):
        return json.load(open(cache, encoding='utf-8'))
    idx, page = {}, 1
    while True:
        d = json.loads(fetch(f'{VJ_API}?apiKey={VJ_KEY}&locale=kr&category=c1&page={page}&pageSize=100'))
        for it in d.get('items') or []:
            p = ((it.get('repPhoto') or {}).get('photoid') or {}).get('imgpath')
            if p:
                idx[it['contentsid'][-5:]] = {'title': it.get('title'), 'img': p}
        if page >= int(d.get('pageCount') or 1):
            break
        page += 1
    json.dump(idx, open(cache, 'w', encoding='utf-8'), ensure_ascii=False)
    return idx


def commons_info(title):
    q = urllib.parse.quote(title)
    d = json.loads(fetch(f'https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1200&format=json&titles={q}'))
    ii = next(iter(d['query']['pages'].values()))['imageinfo'][0]
    m = ii.get('extmetadata') or {}
    artist = re.sub(r'<[^>]+>', '', (m.get('Artist') or {}).get('value', '')).strip()
    lic = (m.get('LicenseShortName') or {}).get('value', '')
    return ii['thumburl'], f'© {artist} · {lic} · Wikimedia Commons'


def main(work):
    from PIL import Image
    os.makedirs(work, exist_ok=True)
    os.makedirs(OUT_DIR, exist_ok=True)
    idx = vj_index(work)
    out = {}
    for oid, picks in PICKS.items():
        for src, kind in picks:
            credit = ''
            if src.startswith('vj:'):
                url = idx[src[3:]]['img']
            else:
                url, credit = commons_info(src[3:])
                time.sleep(1.5)
            fid = hashlib.sha1(src.encode('utf-8')).hexdigest()[:10]
            path = os.path.join(OUT_DIR, f'{fid}.webp')
            if not os.path.exists(path):
                im = Image.open(io.BytesIO(fetch(url))).convert('RGB')
                w, h = im.size  # 4:3으로 가운데 잘라 480x360
                tw = min(w, h * 4 / 3)
                th = tw * 3 / 4
                im = im.crop(((w - tw) / 2, (h - th) / 2, (w + tw) / 2, (h + th) / 2)).resize((480, 360), Image.LANCZOS)
                im.save(path, 'WEBP', quality=62, method=6)
                time.sleep(0.5)
            item = {'f': f'{fid}.webp', 'k': kind}
            if credit:
                item['c'] = credit
            out.setdefault(oid, []).append(item)
            print('  ', oid, kind, src)
    lines = ['// 자동 생성: python -I execution/fetch_oreum_photos.py <작업폴더> — 직접 수정하지 말 것 (고르기는 스크립트의 PICKS)',
             '// 오름 카드 사진 (480x360 webp, public/img/oreums). k: sunset 노을 / sunrise 일출 / spot 포토존 / view 전망 / trail 산책로, c: 출처 표시',
             '', 'export const OREUM_PHOTOS = {']
    lines += [f'    {oid}: {json.dumps(v, ensure_ascii=False)},' for oid, v in out.items()]
    lines += ['};', '']
    open(OUT_JS, 'w', encoding='utf-8', newline='\n').write('\n'.join(lines))
    print(f'{sum(len(v) for v in out.values())}장 → {OUT_JS}')


if __name__ == '__main__':
    main(sys.argv[1])
