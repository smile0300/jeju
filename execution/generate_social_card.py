import os
import requests
from PIL import Image, ImageDraw, ImageFont
from datetime import datetime

# [Gstack Execution Tool] Social Card Generator for Xiaohongshu (小红书)
# 제주도 실시간 정보를 바탕으로 샤오홍슈 포스팅용 이미지 카드를 생성합니다.

def generate_jeju_card(cctv_url, title, status_text, save_path="jeju_social_card.png"):
    """
    CCTV 이미지와 현재 상태 텍스트를 결합하여 소셜 공유용 카드를 만듭니다.
    """
    # 1. 기본 배경 (CCTV 이미지 프레임)
    try:
        img_response = requests.get(cctv_url, stream=True, timeout=10)
        img_response.raise_for_status()
        base_img = Image.open(img_response.raw).convert("RGB")
    except Exception as e:
        print(f"이미지 로드 실패: {e}")
        # 실패 시 단색 배경 생성
        base_img = Image.new('RGB', (1080, 1080), color=(73, 109, 137))

    # 샤오홍슈 최적 비율 (1:1 또는 3:4) - 여기선 1:1 리사이징
    base_img = base_img.resize((1080, 1080), Image.Resampling.LANCZOS)
    draw = ImageDraw.Draw(base_img)

    # 2. 오버레이 및 텍스트 디자인 (Gstack Persona: The Designer)
    # 하단 텍스트 박스
    overlay = Image.new('RGBA', (1080, 250), (0, 0, 0, 160))
    base_img.paste(overlay, (0, 830), overlay)

    # 폰트 설정 (중국어 폰트가 시스템에 있어야 함)
    # 예시: NanumGothic.ttf (사용자 환경에 맞게 경로 수정 필요)
    try:
        font_title = ImageFont.truetype("arial.ttf", 60) # 타이틀
        font_status = ImageFont.truetype("arial.ttf", 40) # 상태설명
    except:
        font_title = ImageFont.load_default()
        font_status = ImageFont.load_default()

    # 텍스트 그리기
    curr_time = datetime.now().strftime("%Y-%m-%d %H:%M")
    draw.text((40, 850), f"📍 {title}", font=font_title, fill=(255, 255, 255))
    draw.text((40, 930), f"🌡️ {status_text} | 🕒 {curr_time}", font=font_status, fill=(255, 204, 0))
    draw.text((40, 1000), "Jeju-Live.com | 济州旅行秘书", font=font_status, fill=(200, 200, 200))

    # 3. 브랜딩 로고 (QR 코드 등) - 옵션
    # draw.rectangle([850, 850, 1030, 1030], fill=(255,255,255)) # QR 영역 등

    base_img.save(save_path)
    print(f"✅ 소셜 카드 생성 완료: {save_path}")

if __name__ == "__main__":
    # 한라산 실시간 예시
    CCTV_PRESET = "https://www.jeju.go.kr/tool/video/video.do?video_id=2" # 1100고지 CCTV 예시
    generate_jeju_card(
        cctv_url=CCTV_PRESET,
        title="1100고지 (실시간)",
        status_text="현재 기온 -2°C | 눈 내리는 중 ❄️"
    )
