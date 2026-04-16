let REWARD_DATA_CACHED = [
    {
        "id": 1,
        "title": "AirPods Pro 2 (Apple)",
        "reward": 150,
        "imageUrl": "https://images.unsplash.com/photo-1588423771073-b8903fbb85b5?auto=format&fit=crop&w=300&q=80"
    },
    {
        "id": 2,
        "title": "10000mAh Power Bank (MI)",
        "reward": 80,
        "imageUrl": "https://images.unsplash.com/photo-1609091839311-d5368196c0ff?auto=format&fit=crop&w=300&q=80"
    },
    {
        "id": 3,
        "title": "iPad Mini 6",
        "reward": 200,
        "imageUrl": "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=300&q=80"
    }
];

/**
 * 구글 드라이브 및 다양한 필드명에 대응하는 이미지 URL 추출 헬퍼 (v2.2: 로컬 이미지 폴백 및 HEIC 경고 추가)
 */
function resolveImageUrl(item) {
    if (!item) return '';

    // 1. 대소문자 구분 없이 이미지 관련 필드 찾기
    const entries = Object.entries(item);
    const imageEntry = entries.find(([k]) => k.toLowerCase() === 'imageurl') || 
                       entries.find(([k]) => k.toLowerCase() === 'image') ||
                       entries.find(([k]) => k.toLowerCase().includes('image')) ||
                       entries.find(([k]) => k.includes('사진') || k.includes('이미지'));
    
    let url = imageEntry ? imageEntry[1] : '';
    
    // 로컬 파일명인 경우 (http로 시작하지 않음)
    if (typeof url === 'string' && url.trim() && !url.trim().startsWith('http')) {
        let filename = url.trim();
        
        // HEIC 형식인 경우 브라우저 미지원 경고 출력
        if (filename.toLowerCase().endsWith('.heic')) {
            console.error(`[Reward] HEIC format detected: "${filename}". This format is NOT supported by browsers. Please convert to JPG/PNG.`);
        }

        // 기본 경로 반환. 에러 발생 시 handleRewardImageError에서 확장자 폴백 처리함.
        return { 
            primary: `/img/rewards/${filename}`, 
            fallback: '', // 로컬 파일의 경우 1차 실패 시 handleRewardImageError가 동적으로 생성
            id: '' 
        };
    }

    if (typeof url !== 'string' || !url.trim().startsWith('http')) return '';

    url = url.trim();

    // 2. 구글 드라이브 공유 링크 → 서버사이드 이미지 프록시 사용 (v2.2 유지)
    if (url.includes('drive.google.com')) {
        const driveMatch = url.match(/\/d\/([a-zA-Z0-9_-]{25,})/) || 
                           url.match(/[?&]id=([a-zA-Z0-9_-]{25,})/) ||
                           url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        
        if (driveMatch && driveMatch[1]) {
            const fileId = driveMatch[1];
            return {
                primary: `/api/image-proxy?id=${fileId}`,
                fallback: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`,
                id: fileId
            };
        }
    }
    
    return { primary: url, fallback: '', id: '' };
}

export async function initReward() {
    renderRewardLoading();
    try {
        const response = await fetch('/api/reward-list');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        
        console.log('[Reward] Data received:', data);

        if (Array.isArray(data) && data.length > 0) {
            REWARD_DATA_CACHED = data;
        }
    } catch (e) {
        console.warn('Failed to fetch reward data, using fallback:', e);
    } finally {
        renderRewardList();
    }
}

export function renderRewardLoading() {
    const listContainer = document.getElementById('reward-list');
    if (!listContainer) return;
    listContainer.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #64748b;">
            <p>正在加载任务列表...</p>
        </div>
    `;
}

export function renderRewardList() {
    const listContainer = document.getElementById('reward-list');
    if (!listContainer) return;

    if (REWARD_DATA_CACHED.length === 0) {
        listContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #64748b;">暂无赏금 任务</div>`;
        return;
    }

    listContainer.innerHTML = REWARD_DATA_CACHED.map((item) => {
        const imgData = resolveImageUrl(item);
        const placeholder = `data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22100%22%20height%3D%22130%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20100%20130%22%3E%3Crect%20width%3D%22100%22%20height%3D%22130%22%20fill%3D%22%23f3f4f6%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20font-size%3D%2214%22%20text-anchor%3D%22middle%22%20alignment-baseline%3D%22middle%22%20fill%3D%22%239ca3af%22%3ENo%20Image%3C%2Ftext%3E%3C%2Fsvg%3E`;
        
        return `
            <div class="reward-card" onclick="applyRewardMission()">
                <div class="reward-img-side">
                    <img src="${imgData.primary || placeholder}" 
                         data-fallback="${imgData.fallback}"
                         data-retry="0"
                         alt="${item.title}" 
                         onerror="handleRewardImageError(this)">
                </div>
                <div class="reward-content-side">
                    <h4 class="reward-item-name">${item.title || '赏금 任务'}</h4>
                    <div class="reward-footer">
                        <div class="reward-amount">
                            REWARD : ${item.reward || 0} <small>RMB</small>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

window.handleRewardImageError = function(img) {
    const retryCount = parseInt(img.getAttribute('data-retry') || '0');
    const fallback = img.getAttribute('data-fallback');
    const placeholder = `data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22100%22%20height%3D%22130%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20100%20130%22%3E%3Crect%20width%3D%22100%22%20height%3D%22130%22%20fill%3D%22%23f3f4f6%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20font-size%3D%2214%22%20text-anchor%3D%22middle%22%20alignment-baseline%3D%22middle%22%20fill%3D%22%239ca3af%22%3ENo%20Image%3C%2Ftext%3E%3C%2Fsvg%3E`;
    
    // 1단계: 명시된 fallback이 있으면 시도
    if (fallback && img.src !== fallback) {
        console.warn('[Reward] Image failed, trying fallback:', fallback);
        img.src = fallback;
        return;
    } 

    // 2단계: 로컬 파일의 경우 다른 확장자나 소문자/대문자 변환 시도
    if (img.src.includes('/img/rewards/') && retryCount < 5) {
        const currentSrc = img.src;
        const lastSlash = currentSrc.lastIndexOf('/');
        const dir = currentSrc.substring(0, lastSlash + 1);
        const fullFilename = currentSrc.substring(lastSlash + 1);
        const extIndex = fullFilename.lastIndexOf('.');
        const base = extIndex > -1 ? fullFilename.substring(0, extIndex) : fullFilename;
        
        const extensions = ['.jpg', '.JPG', '.png', '.PNG', '.jpeg', '.webp'];
        
        if (retryCount < extensions.length) {
            const nextExt = extensions[retryCount];
            // 원본이 HEIC인 경우 특히 안내
            if (fullFilename.toLowerCase().endsWith('.heic')) {
                console.warn(`[Reward] HEIC failed, trying auto-correct to ${nextExt}`);
            }
            
            img.setAttribute('data-retry', (retryCount + 1).toString());
            img.src = dir + base + nextExt;
            return;
        }
    }

    // 최종 실패
    console.error('[Reward] All image sources failed');
    img.src = placeholder;
    img.onerror = null; 
};

window.applyRewardMission = function() {
    if (window.openWechatQR) window.openWechatQR();
};

window.publishRewardMission = function() {
    if (window.openWechatQR) window.openWechatQR();
};
