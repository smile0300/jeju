"""
download_fonts.py
=================
소셜 카드 생성에 필요한 CJK 폰트를 자동으로 다운로드합니다.

- NotoSansSC-Regular.otf : 중국어 간체 + 한글 + 이모지 기호
- NotoSansSC-Bold.otf    : 위의 Bold 버전

[사용법]
  python execution/download_fonts.py
"""

import requests, os, zipfile, io

FONT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "fonts")
os.makedirs(FONT_DIR, exist_ok=True)

# ─── 다운로드 소스 (여러 CDN 폴백) ───────────────────────────
FONTS = [
    {
        "name": "NotoSansSC-Regular.otf",
        "urls": [
            "https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@main/Sans/OTF/SimplifiedChinese/NotoSansSC-Regular.otf",
            "https://cdn.statically.io/gh/notofonts/noto-cjk/main/Sans/OTF/SimplifiedChinese/NotoSansSC-Regular.otf",
        ],
    },
    {
        "name": "NotoSansSC-Bold.otf",
        "urls": [
            "https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@main/Sans/OTF/SimplifiedChinese/NotoSansSC-Bold.otf",
            "https://cdn.statically.io/gh/notofonts/noto-cjk/main/Sans/OTF/SimplifiedChinese/NotoSansSC-Bold.otf",
        ],
    },
]

HEADERS = {"User-Agent": "Mozilla/5.0", "Accept": "application/octet-stream, */*"}

def is_valid(path):
    return os.path.exists(path) and os.path.getsize(path) > 100_000

def download_font(name, urls):
    save_path = os.path.join(FONT_DIR, name)
    if is_valid(save_path):
        sz = os.path.getsize(save_path) / 1024 / 1024
        print(f"  ✅ 이미 존재 (스킵): {name}  ({sz:.1f} MB)")
        return True

    for url in urls:
        try:
            print(f"  ⬇  시도: {url[:80]}...")
            r = requests.get(url, timeout=90, headers=HEADERS)
            r.raise_for_status()
            content = r.content
            if len(content) < 50_000:
                print(f"      응답 너무 작음 ({len(content)} bytes) → 스킵")
                continue
            with open(save_path, "wb") as f:
                f.write(content)
            print(f"      완료! ({len(content)/1024/1024:.1f} MB)")
            return True
        except Exception as e:
            print(f"      실패: {e}")

    return False

def try_google_fonts_zip():
    """마지막 수단: Google Fonts ZIP 다운로드."""
    need = [f for f in FONTS if not is_valid(os.path.join(FONT_DIR, f["name"]))]
    if not need:
        return True

    print("\n  [Google Fonts ZIP 시도 중...] 잠시 기다려 주세요.")
    try:
        r = requests.get(
            "https://fonts.google.com/download?family=Noto+Sans+SC",
            timeout=180,
            headers=HEADERS,
        )
        r.raise_for_status()
        z = zipfile.ZipFile(io.BytesIO(r.content))
        names_needed = {f["name"] for f in need}
        extracted = 0
        for info in z.infolist():
            fn = os.path.basename(info.filename)
            if fn in names_needed:
                save_path = os.path.join(FONT_DIR, fn)
                with open(save_path, "wb") as f:
                    f.write(z.read(info.filename))
                print(f"      추출 완료: {fn}")
                extracted += 1
        return extracted > 0
    except Exception as e:
        print(f"      Google Fonts ZIP 실패: {e}")
        return False

if __name__ == "__main__":
    print("=" * 58)
    print("  소셜 카드용 CJK 폰트 다운로더")
    print(f"  저장 폴더: {os.path.abspath(FONT_DIR)}")
    print("=" * 58)

    ok = 0
    for font in FONTS:
        print(f"\n[ {font['name']} ]")
        if download_font(font["name"], font["urls"]):
            ok += 1

    if ok < len(FONTS):
        print("\n  일부 CDN 실패 → Google Fonts ZIP 대안 시도...")
        try_google_fonts_zip()

    final_ok = sum(1 for f in FONTS if is_valid(os.path.join(FONT_DIR, f["name"])))
    print(f"\n결과: {final_ok}/{len(FONTS)} 폰트 준비 완료")
    if final_ok == len(FONTS):
        print("→ generate_jeju_digest.py 를 실행하면 글자 깨짐 없이 이미지가 생성됩니다!\n")
    else:
        print("→ 일부 폰트를 수동으로 받아야 할 수 있습니다. (자세한 내용은 README 참고)\n")
