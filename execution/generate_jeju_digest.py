"""
generate_jeju_digest.py  v2.0
=============================================
제주 실시간 날씨 + 중국출발 항공편을 담은
샤오홍슈(小红书) 업로드용 1080×1080 소셜 카드 생성기

[사용법]
  1) venv 활성화: .\.venv\Scripts\Activate.ps1
  2) 실행        : python execution/generate_jeju_digest.py
  3) 결과물      : jeju_digest_YYYYMMDD_HHMM.png
"""

import requests, json, re, xml.etree.ElementTree as ET
import urllib.parse
from PIL import Image, ImageDraw, ImageFont
from datetime import datetime, timezone, timedelta

# ─── 설정 ─────────────────────────────────────────────────────
PROXY   = "https://jejuweb.smile0300.workers.dev"
IMG_W   = 1080
IMG_H   = 1080
KST     = timezone(timedelta(hours=9))

# ── 색상 팔레트 (다크 Premium 테마) ──
C_BG      = (14, 20, 32)
C_CARD    = (22, 30, 48)
C_CARD2   = (28, 38, 58)
C_ACCENT  = (99, 179, 237)       # 하늘색 (날씨)
C_GREEN   = (104, 211, 145)      # 초록 (항공편 헤더)
C_GOLD    = (246, 196, 68)       # 황금 (강조)
C_TEXT    = (237, 242, 247)
C_MUTED   = (100, 116, 139)
C_DIV     = (38, 50, 72)
C_DELAY   = (252, 196, 100)
C_CANCEL  = (252, 129, 129)
C_OK      = (104, 211, 145)

# ─── 폰트 로더 ────────────────────────────────────────────────
FONT_CANDIDATES = [
    r"C:\Windows\Fonts\msyh.ttc",      # 微软雅黑 (중국어+한글+이모지 최적)
    r"C:\Windows\Fonts\msyhbd.ttc",
    r"C:\Windows\Fonts\malgunbd.ttf",   # 맑은 고딕 Bold (폴백)
    r"C:\Windows\Fonts\malgun.ttf",
]
FONT_BOLD_CANDIDATES = [
    r"C:\Windows\Fonts\msyhbd.ttc",
    r"C:\Windows\Fonts\malgunbd.ttf",
]

def load_font(size, bold=False):
    candidates = FONT_BOLD_CANDIDATES if bold else FONT_CANDIDATES
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except:
            pass
    return ImageFont.load_default()

# ─── 날씨 아이콘 매핑 (텍스트 기반, 폰트 호환) ───────────────
WEATHER_ICONS = {
    "sunny":   "☀",
    "cloudy":  "⛅",
    "overcast":"☁",
    "rainy":   "☔",
    "snowy":   "❄",
    "shower":  "⛈",
}

# ─── 프록시 헬퍼 ──────────────────────────────────────────────
def proxy_get(endpoint, extra_params=None):
    p = extra_params or {}
    query = urllib.parse.urlencode(p)
    enc = urllib.parse.quote(endpoint, safe="")
    url = f"{PROXY}/api/public-data?endpoint={enc}&{query}"
    try:
        r = requests.get(url, timeout=12)
        r.raise_for_status()
        return r
    except Exception as e:
        print(f"  [WARN] 프록시 오류: {e}")
        return None

# ─── 1. 날씨 데이터 ───────────────────────────────────────────
_SKY_ICON  = {"1": "sunny", "2": "cloudy", "3": "cloudy", "4": "overcast"}
_PTY_ICON  = {"1": "rainy", "2": "shower", "3": "snowy",  "4": "shower"}
_SKY_TEXT  = {"1": "晴   ", "2": "多云  ", "3": "大部多云", "4": "阴天  "}
_PTY_TEXT  = {"1": "降雨  ", "2": "雨夹雪", "3": "降雪  ",  "4": "阵雨  "}
_WIND_DESC = [
    (1,"微风"), (4,"和风"), (9,"清风"), (14,"强风"), (999,"大风")
]

def _wind_text(wsd):
    try:
        v = float(wsd)
        for th, desc in _WIND_DESC:
            if v <= th: return desc
    except:
        pass
    return "大风"

def fetch_weather():
    now = datetime.now(KST)
    h = now.hour
    # 기상청 단기예보 발표 시간 (매 3h, xx30 발표)
    slots = [2, 5, 8, 11, 14, 17, 20, 23]
    base_h = max((s for s in slots if s <= h), default=23)
    base_date = now.strftime("%Y%m%d")
    base_time  = f"{base_h:02d}30"
    print(f"      base_date={base_date}, base_time={base_time}")

    params = {
        "pageNo": 1, "numOfRows": 300, "dataType": "JSON",
        "base_date": base_date, "base_time": base_time,
        "nx": 52, "ny": 38,
    }
    r = proxy_get(
        "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst",
        params,
    )
    if not r:
        return None
    try:
        body = r.json()
        items = body["response"]["body"]["items"]["item"]
    except Exception as e:
        print(f"      [DEBUG] 날씨 JSON 파싱 오류: {e}")
        print(f"      [DEBUG] 응답 일부: {r.text[:200]}")
        return None

    # 시간별 그룹화
    grouped = {}
    for it in items:
        k = it["fcstDate"] + it["fcstTime"]
        grouped.setdefault(k, {})[it["category"]] = it["fcstValue"]

    # 현재 시각 이후 첫 번째 슬롯
    now_key = now.strftime("%Y%m%d%H") + "00"
    keys = sorted(k for k in grouped if k >= now_key)
    if not keys:
        return None

    cur = grouped[keys[0]]
    pty = cur.get("PTY", "0")
    sky = cur.get("SKY", "1")
    icon_key = _PTY_ICON.get(pty) if pty != "0" else _SKY_ICON.get(sky, "cloudy")
    cond_text = _PTY_TEXT.get(pty) if pty != "0" else _SKY_TEXT.get(sky, "多云")

    return {
        "temp":  cur.get("TMP", "--"),
        "pop":   cur.get("POP", "--"),
        "wsd":   cur.get("WSD", "--"),
        "humid": cur.get("REH", "--"),
        "icon_key": icon_key,
        "cond": cond_text.strip(),
        "wind_text": _wind_text(cur.get("WSD", "0")),
    }

# ─── 2. 항공편 ────────────────────────────────────────────────
AIRLINE_SHORT = {
    "CA":"国航","MU":"东航","CZ":"南航","MF":"厦航","ZH":"深航",
    "HO":"吉祥","9C":"春秋","HU":"海南","SC":"山东","GJ":"长龙",
    "QW":"青岛","JD":"首都","CI":"华航","BR":"长荣","CX":"国泰",
    "NX":"澳航","TR":"酷航","IT":"台虎航",
    "OZ":"韩亚","KE":"大韩","7C":"济州",
    "LJ":"真虹","TW":"德威","ZE":"易斯达","BX":"釜山","RS":"首尔",
}
CITY_MAP = {
    "PVG":"上海","SHA":"上海虹桥","PEK":"北京首都","PKX":"北京大兴",
    "HGH":"杭州","CAN":"广州","SZX":"深圳","NKG":"南京","TAO":"青岛",
    "XIY":"西安","CTU":"成都","CKG":"重庆","KMG":"昆明","TSN":"天津",
    "DLC":"大连","SHE":"沈阳","HRB":"哈尔滨","FOC":"福州","XMN":"厦门",
    "SYX":"三亚","HAK":"海口","TNA":"济南","CGQ":"长春","CSX":"长沙",
    "DYG":"张家界","WNZ":"温州","TPE":"台北","HKG":"香港","MFM":"澳门",
    "HFE":"合肥","NGB":"宁波","WEH":"威海","YNT":"烟台",
}

def _parse_time(raw):
    raw = str(raw or "")
    hhmm = raw[8:12] if len(raw) >= 12 else raw[-4:] if len(raw) >= 4 else ""
    return f"{hhmm[:2]}:{hhmm[2:]}" if len(hhmm) == 4 else "-"

def _status_label(s):
    s = s or ""
    if "지연" in s: return "延误", C_DELAY
    if "결항" in s: return "取消", C_CANCEL
    if "출발" in s or "도착" in s: return "完成", C_OK
    if "탑승" in s: return "登机", C_ACCENT
    if "수속" in s: return "値机", C_ACCENT
    return "准点", C_OK

def fetch_flights():
    now  = datetime.now(KST)
    ymd  = now.strftime("%Y%m%d")
    params = {
        "pageNo":1,"numOfRows":300,"searchday":ymd,
        "arr_airport_code":"CJU","_": int(now.timestamp()*1000)
    }
    r = proxy_get(
        "http://openapi.airport.co.kr/service/rest/StatusOfFlights/getArrFlightStatusList",
        params,
    )
    if not r: return []

    txt = r.text.strip()
    flights = []

    def _make(fid, dep_code, sched_raw, status_raw, airline_raw=""):
        dep_code = dep_code.upper()
        if dep_code not in CITY_MAP:
            return None
        code2 = fid[:2].upper()
        return {
            "flight":   fid.upper(),
            "airline":  AIRLINE_SHORT.get(code2, airline_raw or code2),
            "city":     CITY_MAP[dep_code],
            "time":     _parse_time(sched_raw),
            "status_raw": status_raw or "",
        }

    try:
        if txt.startswith("{"):
            items = json.loads(txt)["response"]["body"]["items"]["item"]
            if not isinstance(items, list): items = [items]
            for it in items:
                f = _make(
                    str(it.get("flightid","") or it.get("flightId","")),
                    str(it.get("boardingEng","") or it.get("depAirportCode","")),
                    str(it.get("scheduledatetime","") or it.get("scheduledDateTime","")),
                    str(it.get("rmkKor","") or ""),
                    str(it.get("airline","") or ""),
                )
                if f: flights.append(f)
        else:
            root = ET.fromstring(txt)
            for item in root.iter("item"):
                def gv(tag):
                    el = item.find(tag)
                    return (el.text or "").strip() if el is not None else ""
                f = _make(
                    gv("flightid"),
                    gv("boardingEng") or gv("depAirportCode"),
                    gv("scheduledatetime") or gv("scheduledDateTime"),
                    gv("rmkKor"),
                    gv("airline"),
                )
                if f: flights.append(f)
    except Exception as e:
        print(f"  [WARN] 항공 파싱 오류: {e}")

    # 시간 필터 제거 - 오늘 전체 항공편 표시 (많은 중국 편이 오전 도착)
    return sorted(flights, key=lambda x: x["time"])[:8]

# ─── 3. 이미지 렌더링 ─────────────────────────────────────────
def _rr(d, box, r=16, fill=None, outline=None, w=1):
    """rounded_rectangle 편의함수"""
    d.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=w)

def _tw(d, text, font):
    bb = d.textbbox((0,0), text, font=font)
    return bb[2]-bb[0]

def _th(d, text, font):
    bb = d.textbbox((0,0), text, font=font)
    return bb[3]-bb[1]

def render(weather, flights):
    now = datetime.now(KST)

    # ── 폰트 선언 ──
    F = {
        "logo":    load_font(30, bold=True),
        "date":    load_font(22),
        "sec":     load_font(24, bold=True),
        "huge":    load_font(92, bold=True),
        "temp":    load_font(40, bold=True),
        "medium":  load_font(22),
        "small":   load_font(18),
        "tiny":    load_font(15),
        "badge":   load_font(17, bold=True),
        "stat_v":  load_font(28, bold=True),
        "stat_l":  load_font(15),
        "flight_h":load_font(20, bold=True),
        "flight_v":load_font(21, bold=True),
        "flight_s":load_font(19),
        "icon":    load_font(80),   # 날씨 아이콘(텍스트)
        "icon_sm": load_font(18),
    }

    img = Image.new("RGBA", (IMG_W, IMG_H), C_BG)
    d   = ImageDraw.Draw(img)

    M  = 24   # 바깥 마진
    G  = 14   # 패널 간격

    # ══ [A] 헤더 ══════════════════════════════════════════════
    HH = 100
    _rr(d, [M, M, IMG_W-M, M+HH], r=20, fill=C_CARD)

    d.text((M+22, M+14), "济州旅行秘书", font=F["logo"], fill=C_ACCENT)
    d.text((M+22, M+52), "济州岛 实时情报板", font=F["medium"], fill=C_TEXT)

    date_str = now.strftime("%m/%d  %H:%M KST")
    dtw = _tw(d, date_str, F["date"])
    d.text((IMG_W-M-22-dtw, M+38), date_str, font=F["date"], fill=C_MUTED)

    # ══ [B] 날씨 패널 ══════════════════════════════════════════
    WY0 = M + HH + G
    WH  = 310
    WX1 = IMG_W - M
    _rr(d, [M, WY0, WX1, WY0+WH], r=20, fill=C_CARD)

    # 섹션 타이틀 - 중국어 전용
    d.text((M+22, WY0+16), "[ 天气 ]  济州市 实时天气", font=F["sec"], fill=C_ACCENT)
    d.line([(M+22, WY0+50), (WX1-22, WY0+50)], fill=C_DIV, width=1)

    if weather:
        # 날씨 아이콘 (큰 텍스트 기호)
        icon_char = WEATHER_ICONS.get(weather["icon_key"], "☁")
        d.text((M+30, WY0+58), icon_char, font=F["icon"], fill=C_ACCENT)

        # 온도
        temp_txt = f"{weather['temp']}°"
        d.text((M+160, WY0+62), temp_txt, font=F["huge"], fill=C_TEXT)

        # 날씨 상태 텍스트
        cond_x = M + 160 + _tw(d, temp_txt, F["huge"]) + 24
        d.text((cond_x, WY0+88), weather["cond"], font=F["temp"], fill=C_GOLD)
        d.text((cond_x, WY0+138), "济州市 (连洞)", font=F["small"], fill=C_MUTED)

        # 하단 통계 3개
        stats = [
            ("降水概率", f"{weather['pop']}%"),
            ("风速",     f"{weather['wsd']}m/s  {weather['wind_text']}"),
            ("湿度",     f"{weather['humid']}%"),
        ]
        STAT_W = (IMG_W - M*2 - G*2) // 3
        for i, (label, val) in enumerate(stats):
            sx = M + i*(STAT_W+G)
            sy = WY0 + WH - 118
            _rr(d, [sx, sy, sx+STAT_W, sy+102], r=14, fill=C_CARD2)
            d.text((sx+16, sy+12), label, font=F["stat_l"], fill=C_MUTED)
            d.text((sx+16, sy+38), val,   font=F["stat_v"], fill=C_TEXT)
    else:
        d.text((M+40, WY0+130), "天气数据加载失败，请稍后再试", font=F["medium"], fill=C_MUTED)

    # ══ [C] 항공편 패널 ════════════════════════════════════════
    FY0 = WY0 + WH + G
    FY1 = IMG_H - M - 64 - G   # 푸터 고려
    _rr(d, [M, FY0, IMG_W-M, FY1], r=20, fill=C_CARD)

    d.text((M+22, FY0+16), "[ 航班 ]  今日 中国→济州 到达航班", font=F["sec"], fill=C_GREEN)
    d.line([(M+22, FY0+50), (IMG_W-M-22, FY0+50)], fill=C_DIV, width=1)

    # 컬럼 헤더
    COLS  = [M+22, M+145, M+330, M+490, M+620]
    HEADS = ["航班号", "航空公司", "出发城市", "到达时间", "状态"]
    HY = FY0 + 58
    for cx, hd in zip(COLS, HEADS):
        d.text((cx, HY), hd, font=F["tiny"], fill=C_MUTED)
    d.line([(M+22, HY+22), (IMG_W-M-22, HY+22)], fill=C_DIV, width=1)

    ROW_H = 52
    if flights:
        for i, fl in enumerate(flights):
            ry = FY0 + 88 + i * ROW_H
            if ry + ROW_H > FY1 - 10: break

            # 교대 배경
            if i % 2 == 0:
                _rr(d, [M+10, ry-3, IMG_W-M-10, ry+ROW_H-5], r=8, fill=C_CARD2)

            vals = [fl["flight"], fl["airline"], fl["city"], fl["time"]]
            fonts_col = [F["flight_h"], F["flight_s"], F["flight_s"], F["flight_v"]]
            colors_col= [C_ACCENT,     C_TEXT,         C_TEXT,       C_GOLD]

            for cx, val, fnt, col in zip(COLS, vals, fonts_col, colors_col):
                d.text((cx, ry+8), val, font=fnt, fill=col)

            # 상태 배지
            slabel, scol = _status_label(fl["status_raw"])
            bx0, bx1 = COLS[4], COLS[4]+80
            by0, by1 = ry+4,    ry+38
            _rr(d, [bx0, by0, bx1, by1], r=10,
                fill=(*scol, 40), outline=(*scol, 120), w=1)
            bw = _tw(d, slabel, F["badge"])
            d.text((bx0+(80-bw)//2, by0+8), slabel, font=F["badge"], fill=scol)

            if i < len(flights)-1:
                d.line([(M+22, ry+ROW_H-5), (IMG_W-M-22, ry+ROW_H-5)],
                       fill=C_DIV, width=1)
    else:
        d.text((M+40, FY0+120), "暂无可查询的航班信息", font=F["medium"], fill=C_MUTED)

    # ══ [D] 푸터 ══════════════════════════════════════════════
    FT0 = IMG_H - M - 58
    _rr(d, [M, FT0, IMG_W-M, IMG_H-M], r=16, fill=C_CARD)
    footer = "jeju-live.com  |  济州旅行秘书  |  实时旅行情报"
    fw = _tw(d, footer, F["small"])
    d.text(((IMG_W-fw)//2, FT0+18), footer, font=F["small"], fill=C_MUTED)

    # --워터마크--
    wm = "JejuLive"
    d.text((IMG_W-M-22-_tw(d, wm, F["sec"]), FT0+12), wm, font=F["sec"], fill=C_ACCENT)

    return img.convert("RGB")

# ─── 메인 ─────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 52)
    print("  济州 Daily Digest  소셜 카드 생성기  v2.0")
    print("=" * 52)

    print("\n  [1/2] 날씨 데이터 수집...")
    weather = fetch_weather()
    if weather:
        print(f"      → {weather['temp']}°C  {weather['cond']}  강수{weather['pop']}%")
    else:
        print("      → 실패 (더미 데이터로 진행)")

    print("  [2/2] 항공편 데이터 수집...")
    flights = fetch_flights()
    print(f"      → {len(flights)}개 항공편 수신")

    print("\n  이미지 렌더링...")
    img = render(weather, flights)

    now_kst = datetime.now(KST)
    fname = now_kst.strftime("jeju_digest_%Y%m%d_%H%M.png")
    img.save(fname, "PNG")
    print(f"\n  완료! → {fname}  (1080×1080)")
    print("  이 파일을 샤오홍슈 앱에서 바로 업로드하세요.\n")
