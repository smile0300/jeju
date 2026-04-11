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
                <img src="${item.imageUrl}" alt="${item.title}" onerror="this.src='https://placehold.co/100x130?text=No+Image'">
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
    document.getElementById('reward-wechat-modal').style.display = 'flex';
};

window.publishRewardMission = function() {
    document.getElementById('reward-wechat-modal').style.display = 'flex';
};

window.closeRewardWechatModal = function() {
    document.getElementById('reward-wechat-modal').style.display = 'none';
};

window.copyRewardWechatId = function() {
    const wechatId = document.getElementById('reward-wechat-id').textContent;
    navigator.clipboard.writeText(wechatId).then(() => {
        alert('微信号已复制: ' + wechatId);
    }).catch(err => {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = wechatId;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('微信号已复制: ' + wechatId);
    });
};
