import math

def calculate_hallasan_visibility(humidity, cloud_cover, rain_mm=0):
    """
    한라산 백록담 가시성 확률 계산 알고리즘 (v1.0)
    
    Args:
        humidity (float): 0~100 사이의 상대 습도 (%)
        cloud_cover (float): 0~100 사이의 운량 (%)
        rain_mm (float): 강수량 (mm)
        
    Returns:
        float: 0~100 사이의 가시성 확률
    """
    
    # 1. 기본 점수 (운량 기반)
    # 구름이 맑을수록 점수가 높음
    base_score = 100 - cloud_cover
    
    # 2. 습도 감점
    # 습도가 80%를 넘어가면 안개 발생 확률이 급격히 증가함
    humidity_penalty = 0
    if humidity > 70:
        humidity_penalty = (humidity - 70) * 1.5
    
    # 3. 강수 감점
    # 비나 눈이 오면 가시성은 거의 없음
    rain_penalty = 0
    if rain_mm > 0:
        rain_penalty = 50 + (rain_mm * 10)
        
    # 최종 점수 산산
    score = base_score - humidity_penalty - rain_penalty
    
    # 범위 제한 (0~100)
    score = max(0, min(100, score))
    
    return round(score, 1)

# 테스트 시나리오
scenarios = [
    {"name": "매우 맑음", "h": 40, "c": 0, "r": 0},
    {"name": "약간 흐림", "h": 55, "c": 30, "r": 0},
    {"name": "안개 가득", "h": 95, "c": 80, "r": 0},
    {"name": "비 오는 날", "h": 90, "c": 100, "r": 5.0},
]

if __name__ == "__main__":
    print("--- 한라산 가시성 예측 알고리즘 테스트 ---")
    for s in scenarios:
        result = calculate_hallasan_visibility(s["h"], s["c"], s["r"])
        print(f"[{s['name']}] 습도:{s['h']}% | 운량:{s['c']}% | 강수:{s['r']}mm => 가시성: {result}%")
