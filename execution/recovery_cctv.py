import os

processed_paths_path = r'c:\jeju-live\processed_paths.html'
target_path = r'c:\jeju-live\src\parts\cctv.html'

# Basic structure for cctv.html
template_start = """<!-- ===== CCTV Section ===== -->
<section id="cctv" class="app-section">
    <header class="app-bar">
        <button class="back-btn" onclick="showSection('home')">←</button>
        <h2 class="bar-title">📹 실시간 CCTV</h2>
    </header>

    <div class="cctv-container">
        <!-- 필터 탭 -->
        <div class="cctv-tabs">
            <button class="tab-btn active" onclick="filterByRegion('all')">전체</button>
            <button class="tab-btn" onclick="filterByRegion('jeju')">제주시</button>
            <button class="tab-btn" onclick="filterByRegion('seogwipo')">서귀포시</button>
            <button class="tab-btn" onclick="filterByRegion('east')">동부</button>
            <button class="tab-btn" onclick="filterByRegion('west')">서부</button>
            <button class="tab-btn" onclick="filterByRegion('hallasan')">한라산</button>
        </div>

        <div id="cctv-map-wrapper">
            <svg class="jeju-svg-map" viewBox="0 0 3507 2480" xmlns="http://www.w3.org/2000/svg">
"""

template_end = """
                <!-- 마커 레이어 (지도 위에 표시) -->
                <g id="cctv-markers-layer"></g>
            </svg>
        </div>

        <!-- 한라산 전용 대시보드 (기본 숨김) -->
        <div id="cctv-hallasan-dashboard" class="hallasan-dashboard-container" style="display: none;">
            <!-- hallasan-dashboard.js에 의해 렌더링됨 -->
        </div>

        <!-- CCTV 그리드 컨테이너 -->
        <div id="cctv-grid" class="cctv-grid">
            <!-- 선택된 권역의 CCTV 카드들이 여기에 동적으로 생성됨 -->
        </div>
    </div>
</section>
"""

try:
    with open(processed_paths_path, 'r', encoding='utf-8') as f:
        paths_content = f.read()
    
    full_content = template_start + paths_content + template_end
    
    with open(target_path, 'w', encoding='utf-8') as f:
        f.write(full_content)
    
    print(f"Successfully restored {target_path} using {processed_paths_path}")
except Exception as e:
    print(f"Error: {e}")
