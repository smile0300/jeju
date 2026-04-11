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

export async function initReward() {
    renderRewardLoading();
    try {
        const response = await fetch('/api/reward-list');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        
        // 데이터가 배열이고 하나 이상의 항목이 있을 때만 업데이트
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
            <div class="loading-spinner" style="margin-bottom: 10px;">⌛</div>
            <p>正在加载任务列表...</p>
        </div>
    `;
}

export function renderRewardList() {
    const listContainer = document.getElementById('reward-list');
    if (!listContainer) return;

    if (REWARD_DATA_CACHED.length === 0) {
        listContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #64748b;">暂无赏金任务</div>`;
        return;
    }

    listContainer.innerHTML = REWARD_DATA_CACHED.map((item) => `
        <div class="reward-card" onclick="applyRewardMission()">
            <div class="reward-img-side">
                <img src="${item.imageUrl}" alt="${item.title}" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22100%22%20height%3D%22130%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20100%20130%22%3E%3Crect%20width%3D%22100%22%20height%3D%22130%22%20fill%3D%22%23f3f4f6%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20font-size%3D%2214%22%20text-anchor%3D%22middle%22%20alignment-baseline%3D%22middle%22%20fill%3D%22%239ca3af%22%3ENo%20Image%3C%2Ftext%3E%3C%2Fsvg%3E'">
            </div>
            <div class="reward-content-side">
                <h4 class="reward-item-name">${item.title}</h4>
                <div class="reward-footer">
                    <div class="reward-amount">
                        <small>赏金:</small> ${item.reward} <small>RMB</small>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

window.applyRewardMission = function() {
    if (window.openWechatQR) window.openWechatQR();
};

window.publishRewardMission = function() {
    if (window.openWechatQR) window.openWechatQR();
};
