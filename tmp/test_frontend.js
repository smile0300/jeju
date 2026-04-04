const TRAIL_STATUS_MAP = {
    '정상운영': { cn: '正常运营', cls: 'open' },
    '부분통제': { cn: '部分管制', cls: 'partial' },
    '전면통제': { cn: '全面管制', cls: 'closed' },
    '통제': { cn: '全面管制', cls: 'closed' },
    '일부통제': { cn: '部分管制', cls: 'partial' },
    '입산제한': { cn: '全面管制', cls: 'closed' },
    '탐방불가': { cn: '全面管制', cls: 'closed' }
};

function getStatus(koStatus) {
    let info = TRAIL_STATUS_MAP[koStatus];
    
    if (!info) {
        if (koStatus.includes('전면통제') || koStatus.includes('입산제한') || koStatus.includes('탐방불가') || (koStatus.includes('통제') && !koStatus.includes('부분') && !koStatus.includes('일부'))) {
            info = TRAIL_STATUS_MAP['전면통제'];
        } else if (koStatus.includes('부분') || koStatus.includes('일부') || koStatus.includes('제한') || koStatus.includes('까지')) {
            info = TRAIL_STATUS_MAP['부분통제'];
        } else if (koStatus.includes('정상')) {
            info = TRAIL_STATUS_MAP['정상운영'];
        } else if (koStatus.length > 0) {
            info = { cn: '部分管制', cls: 'partial' };
        } else {
            info = { cn: '--', cls: 'partial' };
        }
    }
    return info;
}

const testCases = [
    "정상운영",
    "강풍주의보로 윗세오름까지",
    "강풍주의보 전면통제",
    "어리목주차장", // Unlikely status, but test length > 0
    "입산제한",
    "일부통제",
    "대설경보 전면통제",
    "정상 운영" // Contains "정상"
];

testCases.forEach(tc => {
    console.log(`${tc} -> ${JSON.stringify(getStatus(tc))}`);
});
