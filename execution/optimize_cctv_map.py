import re
import os

def optimize_svg_path(match):
    path_data = match.group(1)
    # 소수점 3~4자리 이상의 좌표를 1자리로 반올림
    # 숫자(정수 또는 소수)를 찾아서 처리
    def round_coord(m):
        val = float(m.group(0))
        if val == int(val):
            return str(int(val))
        return f"{val:.1f}".rstrip('0').rstrip('.')
    
    optimized_data = re.sub(r"[-+]?\d*\.\d+|\d+", round_coord, path_data)
    return f'd="{optimized_data}"'

def main():
    file_path = r'c:\jeju-live\src\parts\cctv.html'
    
    if not os.path.exists(file_path):
        print(f"Error: {file_path} not found.")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    print(f"Original size: {len(content) / 1024:.2f} KB")

    # 1. 버그 수정: region-jeju의 마지막 배경 패스 제거
    # M371,1008.8 L1157.8,222.1 ...
    buggy_path_pattern = r'<path d="M371,1008\.8 L1157\.8,222\.1[^"]+" />'
    content = re.sub(buggy_path_pattern, '', content)

    # 2. 언어 번역: "CCTV 명칭" -> "监控名称"
    content = content.replace('<h3 id="cctv-target-name">CCTV 명칭</h3>', '<h3 id="cctv-target-name">监控名称</h3>')

    # 3. 성능 최적화: SVG 좌표 반올림
    # d="..." 내의 좌표들 처리
    # re.DOTALL을 사용하지 않아 한 줄씩 처리 (패스 데이터가 보통 한 줄임)
    content = re.sub(r'd="([^"]+)"', optimize_svg_path, content)

    # 4. 불필요한 공백 제거 (연속된 공백 축소)
    # content = re.sub(r' +', ' ', content) # 이건 HTML 구조를 해칠 수 있으므로 조심히 사용

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"Optimized size: {len(content) / 1024:.2f} KB")
    print("Optimization complete.")

if __name__ == "__main__":
    main()
