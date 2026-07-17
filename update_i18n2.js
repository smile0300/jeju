const fs = require('fs');
const file = 'c:/jeju-live/src/js/i18n.js';
let content = fs.readFileSync(file, 'utf8');

// Insert after modal.lost.step2.title
content = content.replace(/'modal\.lost\.step2\.title':\s*'.*?',/g, (match, offset, string) => {
    const prevText = string.substring(Math.max(0, offset - 500), offset);
    const isKo = prevText.includes("'ko':");
    const isEn = prevText.includes("'en':");
    
    let additions = '';
    if (isKo) {
        additions = `
        'modal.lost.city.label':'지역 (도시)',
        'modal.lost.city.jeju':'🌴 제주',
        'modal.lost.city.seoul':'🏙️ 서울',
        'modal.lost.city.busan':'🌊 부산',
        'modal.lost.loc_type.label':'상세 장소',
        'modal.lost.city_err':'지역(도시)을 선택해주세요.',`;
    } else if (isEn) {
        additions = `
        'modal.lost.city.label':'City/Province',
        'modal.lost.city.jeju':'🌴 Jeju',
        'modal.lost.city.seoul':'🏙️ Seoul',
        'modal.lost.city.busan':'🌊 Busan',
        'modal.lost.loc_type.label':'Location Type',
        'modal.lost.city_err':'Please select a city/province.',`;
    } else {
        // zh (default)
        additions = `
        'modal.lost.city.label':'地区 (城市)',
        'modal.lost.city.jeju':'🌴 济州',
        'modal.lost.city.seoul':'🏙️ 首尔',
        'modal.lost.city.busan':'🌊 釜山',
        'modal.lost.loc_type.label':'详细地点',
        'modal.lost.city_err':'请选择地区(城市)。',`;
    }
    return match + additions;
});

fs.writeFileSync(file, content, 'utf8');
console.log('i18n.js updated with city translations');
