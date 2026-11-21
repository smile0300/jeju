// 맛집 데이터(src/data/eats.js)의 한국어 텍스트(메뉴·세부유형·주의사항·선정이유)를
// 중국어/영어로 변환하고, 중국인 여행객의 중국어 별칭·메뉴 검색을 지원하는 모듈.
import { krwToCny } from '../../data/taxi.js';

// 중국인 여행객이 샤오홍슈·다중디엔핑에서 자주 검색하는 제주 인기 매장 별칭 사전
const STORE_ALIASES = [
    ['숙성도', '熟成道 熟成都 熟成黑猪'],
    ['고집돌우럭', '固执石头鱼 高集石斑鱼 石斑鱼'],
    ['명진전복', '明珍鲍鱼 明真鲍鱼 鲍鱼石锅饭'],
    ['자매국수', '姐妹面条 姐妹猪肉面'],
    ['올래국수', '偶来面条 偶来猪肉面'],
    ['우진해장국', '宇进解酒汤 宇镇解酒汤 蕨菜解酒汤'],
    ['돈사돈', '豚司豚 豚似豚 黑猪肉'],
    ['칠돈가', '七豚家 黑猪肉'],
    ['연돈', '延顿 炸猪排'],
    ['풍원', '丰原 汉拿山炒饭 牛岛炒饭'],
    ['블랑로쉐', '布朗罗谢 牛岛花生冰淇淋'],
    ['하하호호', '哈哈呵呵 牛岛汉堡'],
    ['맛나식당', '美味食堂 城山带鱼'],
    ['가시아방', '加西亚邦 猪肉面'],
    ['네거리식당', '十字路口食堂 烤带鱼'],
    ['춘심이네', '春心家 整条烤带鱼'],
    ['김만복', '金万福 鲍鱼紫菜包饭'],
    ['오는정김밥', '来情紫菜包饭 西归浦紫菜包饭'],
    ['블루보틀', '蓝瓶咖啡 Blue Bottle'],
    ['프릳츠', 'Fritz 咖啡 海豹咖啡'],
    ['스타벅스', '星巴克 Starbucks'],
    ['런던베이글', '伦敦贝果 London Bagel'],
    ['랜디스도넛', '兰迪斯甜甜圈 Randy Donuts'],
    ['아베베', 'Abebe 奶油面包 东门市场面包'],
    ['오설록', '雪绿茶 抹茶'],
    ['오드랑', '大蒜面包 咸德面包'],
    ['노티드', 'Knotted 甜甜圈'],
    ['몽상드애월', 'GD咖啡 权志龙咖啡'],
    ['해녀김밥', '海女紫菜包饭'],
    ['도민상회', '岛民商会 黑猪肉'],
    ['복자씨연탄구이', '福子炭火烤肉 黑猪肉'],
    ['곰막식당', '熊幕食堂 青花鱼'],
    ['해월정', '海月亭 海螺面'],
    ['소금바치순이네', '顺伊家 炒章鱼'],
    ['벵디', '章鱼盖饭 咸德章鱼'],
    ['원앤온리', 'One and Only 山房山咖啡'],
    ['테라로사', 'Terarosa 咖啡'],
    ['모알보알', 'Moalboal 巴厘岛风咖啡'],
    ['카페루시아', 'Lucia 悬崖咖啡'],
    ['레이지펌프', 'Lazy Pump 抽水站咖啡'],
    ['카페한라산', '汉拿山咖啡馆 电视机咖啡'],
    ['신촌덕인당', '德仁堂 大麦面包 艾草面包'],
    ['가시식당', '加时食堂 炒黑猪'],
    ['오조해녀의집', '吾照海女之家 鲍鱼粥'],
    ['당케올레국수', '海螺刀削面'],
    ['훈남횟집', '暖男生鱼片 红虾刺身'],
];

// 제주 음식·메뉴·카페 세부유형 한→중/영 사전 (긴 단어를 앞에 배치)
const FOOD_DICT = [
    ['흑돼지주물럭', '辣炒黑猪肉', 'Spicy black pork'],
    ['흑돼지근고기', '厚切黑猪肉', 'Thick-cut black pork'],
    ['흑돼지', '黑猪肉', 'Black pork'],
    ['통갈치구이', '整条烤带鱼', 'Whole grilled hairtail'],
    ['갈치조림', '红烧带鱼', 'Braised hairtail'],
    ['갈치구이', '烤带鱼', 'Grilled hairtail'],
    ['갈치정식', '带鱼套餐', 'Hairtail set'],
    ['갈치국', '带鱼汤', 'Hairtail soup'],
    ['갈치회', '带鱼刺身', 'Hairtail sashimi'],
    ['고등어조림', '红烧青花鱼', 'Braised mackerel'],
    ['고등어구이', '烤青花鱼', 'Grilled mackerel'],
    ['고등어회', '青花鱼刺身', 'Mackerel sashimi'],
    ['활우럭조림', '红烧活石斑鱼', 'Braised rockfish'],
    ['활우럭탕', '活石斑鱼汤', 'Rockfish soup'],
    ['옥돔구이', '烤方头鱼', 'Grilled tilefish'],
    ['딱새우회', '红虾刺身', 'Jeju shrimp sashimi'],
    ['딱새우라면', '红虾拉面', 'Jeju shrimp ramen'],
    ['딱새우김밥', '红虾紫菜包饭', 'Jeju shrimp gimbap'],
    ['전복돌솥밥', '鲍鱼石锅饭', 'Abalone stone-pot rice'],
    ['전복죽', '鲍鱼粥', 'Abalone porridge'],
    ['전복구이', '烤鲍鱼', 'Grilled abalone'],
    ['전복뚝배기', '鲍鱼砂锅', 'Abalone stew'],
    ['오분자기뚝배기', '小鲍鱼海鲜锅', 'Jeju abalone stew'],
    ['해물뚝배기', '海鲜砂锅', 'Seafood stew'],
    ['해물라면', '海鲜拉面', 'Seafood ramen'],
    ['해물짬뽕', '海鲜炒码面', 'Seafood jjamppong'],
    ['돌문어덮밥', '整只章鱼盖饭', 'Octopus rice bowl'],
    ['돌문어볶음', '辣炒章鱼', 'Spicy stir-fried octopus'],
    ['한라산볶음밥', '汉拿山炒饭', 'Hallasan fried rice'],
    ['보말칼국수', '海螺刀削面', 'Sea-snail kalguksu'],
    ['보말죽', '海螺粥', 'Sea-snail porridge'],
    ['성게미역국', '海胆海带汤', 'Sea urchin seaweed soup'],
    ['성게국수', '海胆面', 'Sea urchin noodles'],
    ['고기국수', '济州猪肉面', 'Pork noodles'],
    ['비빔국수', '辣拌面', 'Spicy mixed noodles'],
    ['회국수', '生鱼片拌面', 'Raw-fish noodles'],
    ['닭칼국수', '鸡肉刀削面', 'Chicken kalguksu'],
    ['손칼국수', '手工刀削面', 'Handmade kalguksu'],
    ['칼국수', '刀削面', 'Kalguksu noodles'],
    ['돔베고기', '白切黑猪肉', 'Boiled pork slices'],
    ['두루치기', '铁板辣炒猪肉', 'Spicy pork stir-fry'],
    ['순대국밥', '米肠汤饭', 'Sundae soup'],
    ['모듬순대', '拼盘米肠', 'Assorted sundae'],
    ['장터국밥', '集市汤饭', 'Market soup'],
    ['해장국', '解酒汤', 'Hangover soup'],
    ['내장탕', '牛杂汤', 'Tripe soup'],
    ['고사리해장국', '蕨菜解酒汤', 'Bracken hangover soup'],
    ['몸국', '马尾藻猪肉汤', 'Momguk seaweed soup'],
    ['각재기국', '竹荚鱼汤', 'Horse mackerel soup'],
    ['자리물회', '济州冷鱼汤', 'Damselfish cold soup'],
    ['한치물회', '鱿鱼冷汤', 'Squid cold soup'],
    ['물회', '生鱼片冷汤', 'Cold raw-fish soup'],
    ['간장게장', '酱油蟹', 'Soy-marinated crab'],
    ['양념게장', '辣酱蟹', 'Spicy marinated crab'],
    ['게장', '腌蟹', 'Marinated crab'],
    ['생고기구이', '烤鲜猪肉', 'Fresh pork BBQ'],
    ['삼겹살', '五花肉', 'Pork belly'],
    ['오겹살', '带皮五花肉', 'Five-layer pork belly'],
    ['목살', '猪颈肉', 'Pork neck'],
    ['뼈등심', '带骨里脊', 'Bone-in loin'],
    ['갈비', '排骨', 'Galbi ribs'],
    ['닭갈비', '春川炒鸡', 'Dakgalbi'],
    ['삼계탕', '参鸡탕', 'Samgyetang'],
    ['순두부', '嫩豆腐锅', 'Soft tofu stew'],
    ['냉면', '冷面', 'Naengmyeon'],
    ['밀면', '小麦冷面', 'Milmyeon'],
    ['떡볶이', '辣炒年糕', 'Tteokbokki'],
    ['분식', '韩式小吃', 'Korean snacks'],
    ['김밥', '紫菜包饭', 'Gimbap'],
    ['보리빵', '大麦面包', 'Barley bread'],
    ['쑥빵', '艾草面包', 'Mugwort bread'],
    ['땅콩아이스크림', '花生冰淇淋', 'Peanut ice cream'],
    ['우도땅콩', '牛岛花生', 'Udo peanut'],
    ['수제버거', '手工汉堡', 'Handmade burger'],
    ['생선조림', '红烧鱼', 'Braised fish'],
    ['생선구이', '烤鱼', 'Grilled fish'],
    ['향토음식', '济州乡土料理', 'Jeju local food'],
    ['해산물', '海鲜料理', 'Seafood'],
    ['오션뷰카페', '海景咖啡馆', 'Ocean-view cafe'],
    ['테마카페', '主题咖啡馆', 'Theme cafe'],
    ['정원카페', '花园咖啡馆', 'Garden cafe'],
    ['목장카페', '牧场咖啡馆', 'Ranch cafe'],
    ['베이커리카페', '烘焙咖啡馆', 'Bakery cafe'],
    ['디저트카페', '甜点咖啡馆', 'Dessert cafe'],
    ['베이커리', '面包烘焙', 'Bakery'],
    ['양식코스', '西式套餐', 'Western course'],
    ['양식', '西餐', 'Western food'],
    ['중식', '中餐', 'Chinese food'],
    ['치킨', '炸鸡', 'Fried chicken'],
    ['통닭', '整只炸鸡', 'Whole fried chicken'],
    ['국수', '面食', 'Noodles'],
    ['카페', '咖啡馆', 'Cafe'],
    ['기타', '特色餐厅', 'Specialty'],
    ['전복', '鲍鱼', 'Abalone'],
    ['갈치', '带鱼', 'Hairtail'],
    ['고등어', '青花鱼', 'Mackerel'],
    ['문어', '章鱼', 'Octopus'],
    ['딱새우', '红虾', 'Jeju shrimp'],
    ['성게', '海胆', 'Sea urchin'],
    ['보말', '海螺', 'Sea snail'],
    ['한치', '鱿鱼', 'Squid'],
    ['감귤', '济州橘子', 'Jeju tangerine'],
    ['한라봉', '汉拿峰橘', 'Hallabong'],
    ['말차', '抹茶', 'Matcha'],
    ['녹차', '绿茶', 'Green tea'],
    ['아이스크림', '冰淇淋', 'Ice cream'],
    ['라떼', '拿铁', 'Latte'],
    ['아메리카노', '美式咖啡', 'Americano'],
    ['커피', '咖啡', 'Coffee'],
    ['도넛', '甜甜圈', 'Donuts'],
    ['케이크', '蛋糕', 'Cake'],
    ['까눌레', '可露丽', 'Canele'],
    ['토스트', '吐司', 'Toast'],
    ['쌈밥', '包饭套餐', 'Ssambap set'],
    ['조개죽', '贝壳粥', 'Clam porridge'],
    ['국밥', '汤饭', 'Soup with rice'],
    ['정식', '套餐', 'Set meal'],
    ['백반', '家常套餐', 'Home-style set'],
];

/** 가게 이름의 중국어 별칭(검색 및 보조 표기용) */
export function zhStoreAlias(nameKo) {
    if (!nameKo) return '';
    const hits = [];
    for (const [ko, zh] of STORE_ALIASES) {
        if (nameKo.includes(ko)) hits.push(zh);
    }
    return hits.join(' ');
}

/** 한국어 메뉴·세부유형 문자열을 현재 언어로 변환 */
export function translateFoodText(text, lang = 'zh') {
    if (!text || lang === 'ko') return text || '';
    const idx = lang === 'en' ? 2 : 1;
    let out = text;
    for (const row of FOOD_DICT) {
        if (out.includes(row[0])) {
            out = out.split(row[0]).join(row[idx]);
        }
    }
    return out;
}

// 주의사항(cn) 패턴 매칭 번역 (한국어 원문 → 중국어 / 영어 핵심 팁)
const CN_RULES = [
    [/한국어 메뉴판만|메뉴판 한국어 위주/, '仅提供韩文菜单（建议用下方点餐卡）', 'Korean menu only (use order card below)'],
    [/100%\s*예약제|당일 현장 방문 불가/, '需100%提前预约，不接受现场直接到店', '100% reservation only — no walk-ins'],
    [/캐치테이블.*필수|원격 줄서기 필수/, '强烈建议提前用 CatchTable 远程取号', 'CatchTable remote waitlist strongly advised'],
    [/현장.*번호표|번호표 수령/, '需提早到店现场领取号码牌', 'Must grab an on-site queue ticket early'],
    [/2인.*이상|기본 2인분/, '招牌菜需2人份起点', 'Signature dish requires 2+ servings'],
    [/1인.*가능|개당 1인분/, '支持一人食 / 可单人点餐', 'Solo dining welcome'],
    [/노키즈존|미성년자 출입 제한/, '禁止儿童/未成年人入内（No Kids Zone）', 'No Kids Zone (age restriction)'],
    [/재료 소진.*마감|조기 마감|조기 품절|한정 수량/, '热门菜品售完即提前打烊，建议早点去', 'May close early when sold out — go early'],
    [/우도 배|마지막 배/, '配合牛岛末班船时间，下午5点左右打烊（停航时休息）', 'Closes ~5pm for last Udo ferry; closed if ferry cancels'],
    [/점심.*영업|저녁 식사 불가|점심까지만/, '仅营业至下午，不提供晚餐', 'Lunch / daytime only — no dinner service'],
    [/아침.*영업|아침 식사 적합/, '清晨营业，适合吃早餐', 'Open early — great for breakfast'],
    [/포장.*가능|포장 위주/, '支持打包外带', 'Takeout available'],
    [/선불/, '需在柜台先点餐付款', 'Pay at counter when ordering'],
    [/후불/, '入座点餐，餐后结账', 'Order at table, pay after meal'],
    [/웨이팅|대기.*발생|대기열/, '用餐高峰期可能需要排队', 'Expect queues during peak hours'],
    [/주차.*협소|주차 공간/, '门前停车位较少', 'Limited parking'],
    [/좌석.*협소|아담하여|소규모|한정적/, '店内座位不多，人多时可能需要拼桌或等位', 'Small seating area'],
    [/전원 동시 입장/, '需同行人员全部到齐后方可入座', 'Whole party must be present to be seated'],
    [/조리 시간.*소요/, '现点现做，需等待约15~20分钟', 'Cooked to order (~15–20 min wait)'],
    [/연탄 연기/, '炭火烤肉略有油烟', 'Charcoal smoke'],
];

/** 주의사항(cn) 원문을 현재 언어의 핵심 포인트 배열로 변환 */
export function translateCaution(cn, lang = 'zh') {
    if (!cn) return [];
    if (lang === 'ko') return cn.split(' / ').map(s => s.trim()).filter(Boolean);
    const idx = lang === 'en' ? 2 : 1;
    const out = [];
    const seen = new Set();

    // 브레이크타임 시간 추출
    const bt = cn.match(/브레이크타임\s*([\d:~–-]+)/);
    if (bt) {
        out.push(lang === 'en' ? `Break time ${bt[1]}` : `午休时间 ${bt[1]}（暂不接待）`);
    }
    // 라스트오더 시간 추출
    const lo = cn.match(/라스트오더\s*([\d:]+)/);
    if (lo) {
        out.push(lang === 'en' ? `Last order ${lo[1]}` : `最后点餐时间 ${lo[1]}`);
    }

    for (const rule of CN_RULES) {
        if (rule[0].test(cn) && !seen.has(rule[idx])) {
            seen.add(rule[idx]);
            out.push(rule[idx]);
        }
    }
    return out;
}

/** 선정이유(why) 핵심 요약 생성 (중국어/영어) */
export function translateWhy(d, lang = 'zh') {
    if (!d.why) return '';
    if (lang === 'ko') return d.why;
    const parts = [];
    const w = d.why;
    const years = w.match(/(\d+)\s*년\s*이상|(\d+)\s*년\s*업력/);
    if (years) {
        const y = years[1] || years[2];
        parts.push(lang === 'en' ? `${y}+ years in business` : `${y}年以上老店`);
    }
    if (/백년가게/.test(w)) parts.push(lang === 'en' ? 'Certified 100-Year Shop' : '韩国政府认证百年老店');
    if (/향토음식점/.test(w)) parts.push(lang === 'en' ? 'Jeju Official Local-Food Restaurant' : '济州道官方认证乡土美食店');
    if (/착한가격업소/.test(w)) parts.push(lang === 'en' ? 'Government Fair-Price Shop' : '韩国政府认证平价良心店');
    if (/직원이 직접 구워|그릴링 서비스/.test(w)) parts.push(lang === 'en' ? 'Staff grills the meat for you' : '店员全程帮忙烤肉');
    if (/해녀.*직영|해녀가 직접/.test(w)) parts.push(lang === 'en' ? 'Run by Jeju haenyeo divers' : '济州海女直营新鲜食材');
    if (/오션뷰|바다를 바라보|바다 바로 앞/.test(w)) parts.push(lang === 'en' ? 'Ocean view seats' : '一线海景座位');
    if (/도민.*단골|현지인.*맛집|지역 주민/.test(w)) parts.push(lang === 'en' ? 'Favorite among Jeju locals' : '济州本地人常去的口碑店');
    if (/외국인.*만족도|중화권/.test(w)) parts.push(lang === 'en' ? 'High satisfaction among international visitors' : '深受中国及海外游客好评');

    if (d.rv?.[lang]) return d.rv[lang];
    if (parts.length) return parts.join(' · ');
    // fallback: 세부유형 기반 간단 설명
    const sub = translateFoodText(d.s || '', lang);
    return sub ? (lang === 'en' ? `Popular Jeju spot for ${sub}` : `济州人气${sub}名店`) : '';
}

/** 원화 가격 배열 [lo, hi] → 위안화 근사 문자열 ("≈¥47~93") */
export function cnyPriceHint(p) {
    if (!p || (!p[0] && !p[1])) return '';
    const [lo, hi] = p;
    if (lo && hi && hi !== lo) return `≈¥${krwToCny(lo)}~${krwToCny(hi)}`;
    const v = lo || hi;
    return v ? `≈¥${krwToCny(v)}${hi === 0 && lo ? '+' : ''}` : '';
}

/** 식당 대리 예약 화면(/food)으로 이동하며 가게명 자동 입력 */
export function openFoodBooking(storeName) {
    if (typeof window.showSection === 'function') {
        window.showSection('food');
    }
    setTimeout(() => {
        const input = document.getElementById('food-store');
        if (input && storeName) {
            input.value = storeName;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.focus();
        }
    }, 80);
}
