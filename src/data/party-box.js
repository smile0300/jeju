// 셀프 파티박스 (기념일 이벤트, BETA) — 상품·가격·문구·사진의 단일 출처
// 화면(src/js/features/party.js)과 접수 API(functions/api/event.js)가 같은 표를 쓴다 → 가격을 고치면 둘 다 바뀜.
// 금액은 위안화(¥, 위챗 결제 기준). 문구는 ko/en/zh 3개 모두 채울 것.
// 사진: public/img/party/*.webp (Gemini Neon으로 만든 효과 예시 이미지 — 화면에 '效果示意图' 표시)

export const PARTY_UPDATED = '2026-11-25';
export const KRW_PER_CNY = 200; // 한국어 화면 참고용 원화 환산 (결제는 위안화)
const IMG = '/img/party/';

// 베이스 박스 (필수, 약 ₩50,000). 정가는 오픈특가 비교 표시용
export const PARTY_BASE = {
    key: 'base', price: 258, listPrice: 328, min: 3, img: IMG + 'p-base.webp',
    name: { zh: '基础派对盒', ko: '베이스 박스', en: 'Base box' },
    desc: {
        zh: '透明礼盒 + 满满鲜花花艺（已保水）+ LED灯串 + 定制留言卡 + 迷你欢迎牌和木画架',
        ko: '투명 기프트 박스 + 풍성한 생화 어레인지(물처리 완료) + LED 와이어 전구 + 맞춤 메시지 카드 + 미니 웰컴보드·이젤',
        en: 'Clear gift box + a full fresh flower arrangement (water-ready) + LED fairy lights + custom message card + mini welcome board & easel',
    },
};

// 추가 옵션 (¥). min = 손님이 직접 꾸미는 데 걸리는 대략 시간(분)
export const PARTY_OPTIONS = [
    { key: 'balloon', price: 128, min: 1, lettering: true, img: IMG + 'p-balloon.webp',
      name: { zh: '透明波波球', ko: '버블풍선', en: 'Bubble balloon' },
      desc: { zh: '20寸波波球+支架+定制字贴，充好气送到', ko: '20인치 버블풍선+지지대+맞춤 레터링, 바람 넣어 배송', en: '20" balloon + stand + custom lettering, arrives inflated' } },
    { key: 'couple', price: 98, min: 5, img: IMG + 'p-couple.webp',
      name: { zh: '情侣氛围包', ko: '커플 무드 팩', en: 'Couple mood pack' },
      desc: { zh: '桌旗+LED蜡烛2支+红酒杯2只+花瓣', ko: '테이블 러너+LED 캔들 2p+와인잔 2p+꽃잎', en: 'Table runner + 2 LED candles + 2 wine glasses + petals' } },
    { key: 'friends', price: 78, min: 1, img: IMG + 'p-friends.webp',
      name: { zh: '闺蜜拍照包', ko: '우정 포토 팩', en: 'Friends photo pack' },
      desc: { zh: '爱心墨镜2副+迷你皇冠+珍珠发夹', ko: '하트 선글라스 2p+미니 티아라+진주 리본핀', en: '2 heart sunglasses + mini tiara + pearl clips' } },
    { key: 'family', price: 78, min: 2, img: IMG + 'p-family.webp',
      name: { zh: '家庭派对包', ko: '가족 파티 팩', en: 'Family party pack' },
      desc: { zh: '派对帽4顶+彩旗拉花+生日蜡烛', ko: '고깔모자 4p+삼각 가랜드+생일 초', en: '4 party hats + bunting garland + birthday candles' } },
    { key: 'volume', price: 98, min: 0, img: IMG + 'p-volume.webp',
      name: { zh: '鲜花加量', ko: '생화 볼륨업', en: 'More flowers' },
      desc: { zh: '花量升级为1.5~2倍，更显隆重', ko: '꽃 양 1.5~2배, 더 화려하게', en: '1.5–2× the flowers for a bigger wow' } },
    { key: 'photos', price: 38, min: 4, img: IMG + 'p-photos.webp',
      name: { zh: '照片冲印', ko: '추억 사진 인화', en: 'Photo prints' },
      desc: { zh: '微信发5张照片，冲印+木夹麻绳', ko: '위챗으로 사진 5장, 인화+집게·마끈', en: 'Send 5 photos on WeChat; prints + clips & twine' } },
    { key: 'cake', price: 198, min: 1, img: IMG + 'p-cake.webp',
      name: { zh: '迷你字母蛋糕', ko: '미니 레터링 케이크', en: 'Mini lettering cake' },
      desc: { zh: '济州市合作蛋糕店制作，可写字，一起送到', ko: '제주시내 제휴 케이크숍, 문구 가능, 함께 배송', en: 'Partner bakery in Jeju City, custom message, delivered together' } },
    // 주류는 술 종류·시세에 따라 값이 달라 고정가 없음(variable) → 합계에서 빼고 위챗으로 따로 견적
    { key: 'liquor', price: 0, variable: true, min: 0, img: IMG + 'p-sparkling.webp',
      name: { zh: '酒类（烧酒·红酒等）', ko: '주류 (소주·와인 등)', en: 'Drinks (soju, wine, etc.)' },
      desc: { zh: '按您喜好准备济州烧酒、红酒等，价格随酒款变动，微信另行报价。需年满19岁', ko: '원하는 소주·와인 등을 준비해 드려요. 술 종류에 따라 가격이 달라 위챗으로 따로 안내. 만 19세 이상', en: 'Jeju soju, wine, etc. as you like. Price depends on the bottle — quoted separately on WeChat. 19+ only' } },
    { key: 'camera', price: 138, min: 0, img: IMG + 'p-camera.webp',
      name: { zh: '一次性胶片相机', ko: '일회용 필름카메라', en: 'Disposable film camera' },
      desc: { zh: '柯达/富士正品，旅行回忆用', ko: '코닥/후지 정품, 여행 추억용', en: 'Genuine Kodak/Fuji, for trip memories' } },
];

// 누구와 — 화면 맨 위 탭. 고르면 완성 사진·추천 조합이 바뀐다. 커플은 상대가 씻는 동안(약 10분) 끝낼 수 있는 구성만
export const PARTY_COMBOS = {
    couple: { options: ['balloon', 'couple'], img: IMG + 'hero-couple.webp',
              tab: { zh: '💑 情侣', ko: '💑 커플', en: '💑 Couple' },
              name: { zh: '情侣纪念日布置', ko: '커플 기념일 세팅', en: 'Couple anniversary set-up' },
              scene: { zh: '1周年·纪念日·求婚·生日惊喜', ko: '1주년·기념일·프로포즈·생일 서프라이즈', en: 'Anniversaries, proposals, birthday surprises' },
              hint: { zh: 'TA洗澡的10分钟就能布置好', ko: '상대가 씻는 10분 안에 세팅 끝', en: 'Done in the 10 minutes they spend in the shower' } },
    friends: { options: ['balloon', 'friends', 'photos'], img: IMG + 'hero-friends.webp',
               tab: { zh: '👯 闺蜜', ko: '👯 우정', en: '👯 Friends' },
               name: { zh: '闺蜜旅行派对布置', ko: '우정여행 파티 세팅', en: 'Friends trip party set-up' },
               scene: { zh: '生日·30岁·10周年友情旅行', ko: '생일·서른 기념·10주년 우정여행', en: 'Birthdays, milestone trips with friends' },
               hint: { zh: '拍照道具齐全，一起布置一起拍', ko: '포토 소품까지, 같이 꾸미고 같이 찍기', en: 'Props included — set up and shoot together' } },
    family: { options: ['balloon', 'family', 'cake'], img: IMG + 'hero-family.webp',
              tab: { zh: '👨‍👩‍👧 家庭', ko: '👨‍👩‍👧 가족', en: '👨‍👩‍👧 Family' },
              name: { zh: '家庭生日布置', ko: '가족 생일 세팅', en: 'Family birthday set-up' },
              scene: { zh: '爸妈生日·宝宝生日·家庭旅行纪念', ko: '부모님 생일·아이 생일·가족여행 기념', en: "Parents' or kids' birthdays on a family trip" },
              hint: { zh: '蛋糕和派对帽一起送到房间', ko: '케이크·고깔모자까지 한 번에 배송', en: 'Cake and party hats arrive together' } },
};
export const COUPLE_MINUTES = 10; // 커플: 이 시간을 넘으면 화면에서 경고

// 배송 (제주시내만). ¥398 이상 무료
export const PARTY_DELIVERY = { fee: 40, freeFrom: 398 };

// 받는 방법
export const PARTY_METHODS = [
    { key: 'front',
      name: { zh: '酒店前台寄存', ko: '호텔 프런트 보관', en: 'Hotel front desk' },
      desc: { zh: '入住前送到前台，办理入住时一起领取。能否寄存由我们提前与酒店确认。', ko: '체크인 전에 프런트에 맡겨 두고, 체크인할 때 함께 받습니다. 보관 가능 여부는 저희가 호텔에 미리 확인합니다.', en: 'Left at the front desk before check-in and handed to you when you check in. We confirm with the hotel in advance.' } },
    { key: 'door',
      name: { zh: '民宿门口无接触', ko: '문 앞 비대면 (에어비앤비·민박)', en: 'Doorstep drop (Airbnb / guesthouse)' },
      desc: { zh: '按约定时间放在门口或玄关内，拍照通知您已送达。', ko: '정한 시간에 문 앞이나 현관 안쪽에 두고 사진으로 배송 완료를 알려드립니다.', en: 'Left at the door or inside the entrance at the agreed time, with a photo to confirm.' } },
    { key: 'hand',
      name: { zh: '当面交付', ko: '직접 전달', en: 'Hand-over' },
      desc: { zh: '在大堂或停车场当面交给您，可安排在TA不在场的时间。', ko: '로비나 주차장에서 직접 전해 드립니다. 상대방이 자리에 없는 시간으로 맞춰요.', en: 'We meet you in the lobby or car park, timed for when your partner is away.' } },
];

// 세팅 대행 (유료, 하루 1건, 호텔 문의 필요)
export const PARTY_SETUP = {
    price: 148, perDay: 1, // ¥ (약 ₩30,000)
    name: { zh: '代布置服务', ko: '세팅 대행', en: 'We set it up for you' },
    desc: {
        zh: '我们进房间帮您布置好（约20–30分钟）。每天仅限1组，需要先向酒店确认，确认后才算预约成功。',
        ko: '저희가 객실에 들어가 꾸며 드립니다 (약 20~30분). 하루 1건만 받으며, 호텔 확인이 끝나야 예약이 확정됩니다.',
        en: 'We go into the room and set everything up (about 20–30 min). One booking per day, confirmed only after we check with the hotel.',
    },
    ways: [
        { key: 'cardkey',
          name: { zh: '前台交房卡（最常用）', ko: '프런트에서 카드키 받기 (가장 많음)', en: 'Card key at the front desk (most common)' },
          desc: { zh: '您办理入住后把房卡交给我们，布置完归还。大多数酒店可行。', ko: '체크인 후 로비·프런트에서 카드키를 받아 세팅하고 돌려드립니다. 대부분의 호텔에서 가능.', en: 'You check in and pass us the card key in the lobby; we return it when done. Works at most hotels.' } },
        { key: 'proxy',
          name: { zh: '代办入住', ko: '대리 체크인', en: 'We check in for you' },
          desc: { zh: '在您同意且酒店允许时，由我们代为入住并布置，您按时到达即可。部分酒店不可。', ko: '예약자 동의와 호텔 정책이 허용되면 저희가 대신 체크인해 세팅합니다. 호텔에 따라 불가.', en: 'With your consent and the hotel’s OK, we check in and set up; you just arrive on time. Not every hotel allows it.' } },
        { key: 'escort',
          name: { zh: '陪同进房', ko: '동반 입실', en: 'Enter together' },
          desc: { zh: '安保严格的酒店，由您陪同进房，在TA不在时布置。所有酒店可行。', ko: '보안이 엄격한 호텔은 고객님과 함께 들어가, 상대방이 자리를 비운 사이 세팅합니다. 모든 호텔 가능.', en: 'For strict hotels, you walk us in and we set up while your partner is out. Works everywhere.' } },
    ],
};

// 화면 문구
export const PARTY_TEXT = {
    zh: {
        title: '纪念日派对盒',
        beta: '测试版：开业特价仅限前20组，下单后通过微信确认并付款。',
        hero: '不贴墙、不用归还 — 在房间1分钟变出纪念日布置',
        point1: '🧷 不粘墙不留痕，不违反住宿规定',
        point2: '🛎️ 入住前也能送到前台',
        point3: '🎁 全部归您，无需回收',
        who: '和谁一起？',
        kind: '酒店房间布置套装 · 送货上门', sample: '效果示意图', from: '起', pick_combo: '选这套', picked: '✓ 已选这套',
        combo_title: '推荐组合', base_title: '必选：基础派对盒', opt_title: '自由加购（点击选择）', add: '加入', added: '✓ 已加',
        step1: '选套餐', step2: '加购', step3: '填写预约', next: '下一步', back: '上一步', change: '更改',
        pkg_title: '① 选择套餐', pkg_select: '选这个', pkg_selected: '✓ 已选', base_note: '每个套餐都包含：',
        add_title: '② 加购物品（可选）', add_sub: '想更有氛围可以加，不加也可以直接下一步', included: '套餐已含', no_extra: '未加购',
        info_title: '③ 填写预约信息', your_order: '您的选择', extra: '加购',
        base: '必选', open_price: '开业特价', options: '自由加购',
        minutes: '自己布置约{n}分钟', minutes_over: '⚠️ 约{n}分钟，超过洗澡的10分钟。想偷偷准备的话可以减少选项，或选择代布置。',
        combo_apply: '一键选择',
        delivery: '怎么收到？', setup_way: '进房方式',
        setup_note: '住宿由您自行预订，费用不含房费。告诉我们酒店名称，我们会提前确认能否带入、可布置的时间和所需手续。',
        setup_full: '这一天的代布置已约满（每天1组），请换日期或选择其他收货方式。',
        stay_type: '住宿类型', stay_hotel: '酒店', stay_airbnb: '民宿/Airbnb', stay_other: '其他',
        stay_name: '住宿名称', stay_name_ph: '例：济州新罗酒店 / Airbnb链接',
        stay_addr: '地址（民宿必填）', stay_addr_ph: '韩文或英文地址',
        area_note: '目前只配送济州市区，其他地区请在备注里说明，我们微信沟通。',
        date: '使用日期', checkin: '预计入住时间', booker: '酒店预订人姓名', booker_ph: '前台寄存/核对用（拼音/英文）',
        wechat: '微信ID', wechat_ph: '请输入您的微信ID',
        surprise: '这是惊喜，请避开TA联系我',
        card: '留言卡内容', card_ph: '想写在卡片上的话（中文可以）',
        lettering: '波波球字贴', lettering_ph: '例：HAPPY 1st ANNIVERSARY',
        note: '其他要求', note_ph: '颜色偏好、过敏、特殊情况等',
        variable: '时价', liquor: '想要的酒', liquor_ph: '例：汉拿山烧酒2瓶、红酒1瓶（预算约¥200）', sum_liquor: '酒类', sum_liquor_v: '时价·微信报价', sum_plus: '另加酒类费用',
        how_title: '收到后怎么用？', how1: '送达：按约定放前台或门口，送到后微信通知您', how2: '布置：照盒内说明顺序摆放，约10分钟，情侣套餐趁TA洗澡就够', how3: '拍照：关大灯、开氛围灯，打卡出片', how4: '收纳：用完把装饰装回袋子，退房前收好',
        clean: '🧹 酒店清洁提醒：请勿用胶带贴墙，蜡烛均为LED（无明火）；花瓣、气球请在退房前收回袋中，以免酒店收取额外清洁费。',
        busy_warn: '这天代布置已约满，请换一天或选择其他收货方式',
        sum_items: '商品', sum_setup: '代布置', sum_delivery: '配送费', sum_free: '免费（满¥398）', sum_total: '合计',
        agree: '我已了解：本商品为定制制作。D-7前全额退款 / D-4~6 退70% / D-2~3 退50% / D-1~当天不退。航班因天气取消（凭证明）可免费改期1次。',
        submit: '提交预约', submitting: '提交中...', fill: '请填写必填项', agree_err: '请先勾选同意退改规则',
        success: '✅ 已收到！我们会通过微信确认库存、酒店情况并发送付款方式。', fail: '❌ 提交失败，请稍后再试。',
        qr: '请扫码添加微信，付款后预约生效', qr_hint: '长按图片保存二维码',
    },
    ko: {
        title: '기념일 파티박스',
        beta: '베타: 오픈특가는 선착순 20팀. 주문 후 위챗으로 확인·결제합니다.',
        hero: '벽에 안 붙이고, 반납도 없이 — 숙소에서 1분 만에 기념일 연출',
        point1: '🧷 테이프 없이 세우는 구성, 숙소 규정 걱정 없음',
        point2: '🛎️ 체크인 전에도 프런트로 배송',
        point3: '🎁 모두 소장, 수거 없음',
        who: '누구와 함께?',
        kind: '호텔 객실 기념일 세팅 박스 · 숙소로 배송', sample: '연출 예시 이미지', from: '부터', pick_combo: '이 구성 담기', picked: '✓ 담은 구성',
        combo_title: '추천 조합', base_title: '필수: 베이스 박스', opt_title: '추가 옵션 (눌러서 선택)', add: '담기', added: '✓ 담음',
        step1: '상품 선택', step2: '추가 물품', step3: '예약 정보', next: '다음', back: '이전', change: '변경',
        pkg_title: '① 상품 선택', pkg_select: '선택', pkg_selected: '✓ 선택됨', base_note: '모든 상품에 포함:',
        add_title: '② 추가 물품 (선택)', add_sub: '더 풍성하게 하고 싶다면 추가하세요. 없이 바로 다음으로 가도 됩니다', included: '상품에 포함', no_extra: '추가 없음',
        info_title: '③ 예약 정보 입력', your_order: '선택한 구성', extra: '추가',
        base: '필수', open_price: '오픈특가', options: '추가 옵션',
        minutes: '직접 세팅 약 {n}분', minutes_over: '⚠️ 약 {n}분 — 씻는 10분을 넘습니다. 몰래 준비하려면 옵션을 줄이거나 세팅 대행을 고르세요.',
        combo_apply: '한 번에 담기',
        delivery: '어떻게 받을까요?', setup_way: '객실 입실 방식',
        setup_note: '숙소는 고객님이 직접 예약하며, 숙박비는 포함되지 않습니다. 호텔명을 알려주시면 반입 가능 여부·세팅 가능 시간·필요한 절차를 미리 확인해 안내드립니다.',
        setup_full: '이 날짜의 세팅 대행은 마감입니다 (하루 1건). 다른 날짜나 다른 받는 방법을 골라 주세요.',
        stay_type: '숙소 유형', stay_hotel: '호텔', stay_airbnb: '에어비앤비·민박', stay_other: '기타',
        stay_name: '숙소명', stay_name_ph: '예: 제주신라호텔 / 에어비앤비 링크',
        stay_addr: '주소 (민박은 필수)', stay_addr_ph: '한글 또는 영문 주소',
        area_note: '지금은 제주시내만 배송합니다. 다른 지역은 요청사항에 적어 주시면 위챗으로 상의드려요.',
        date: '이용 날짜', checkin: '체크인 예정 시간', booker: '숙소 예약자 이름', booker_ph: '프런트 보관·확인용 (영문)',
        wechat: '위챗 ID', wechat_ph: '위챗 ID를 입력하세요',
        surprise: '서프라이즈예요 — 상대방 몰래 연락해 주세요',
        card: '메시지 카드 문구', card_ph: '카드에 쓸 말',
        lettering: '풍선 레터링', lettering_ph: '예: HAPPY 1st ANNIVERSARY',
        note: '요청사항', note_ph: '색상 취향, 알레르기, 특별한 상황 등',
        variable: '가격 변동', liquor: '원하는 술', liquor_ph: '예: 한라산 소주 2병, 레드와인 1병 (예산 ¥200 정도)', sum_liquor: '주류', sum_liquor_v: '변동·위챗 견적', sum_plus: '주류 금액 별도',
        how_title: '받은 뒤에는 이렇게', how1: '도착: 약속한 대로 프런트나 문 앞에 두고 위챗으로 알려드려요', how2: '세팅: 박스 안 안내 순서대로 약 10분, 커플은 상대가 씻는 동안이면 충분', how3: '촬영: 큰 불 끄고 무드등 켜고 인생샷', how4: '정리: 다 쓰면 장식을 봉투에 다시 담아 체크아웃 전에 정리',
        clean: '🧹 호텔 청소 안내: 벽에 테이프를 붙이지 마세요. 초는 모두 LED(불꽃 없음)예요. 꽃잎·풍선은 체크아웃 전에 봉투에 담아 주세요. 호텔 추가 청소비를 막을 수 있어요.',
        busy_warn: '이 날은 세팅 대행이 마감됐어요. 다른 날이나 다른 받는 방법을 골라 주세요',
        sum_items: '상품', sum_setup: '세팅 대행', sum_delivery: '배송비', sum_free: '무료 (¥398 이상)', sum_total: '합계',
        agree: '주문 제작 상품임을 확인했습니다. D-7 전액 환불 / D-4~6 70% / D-2~3 50% / D-1~당일 환불 불가. 기상 악화로 항공편 결항 시(증빙) 1회 무료 일정 변경.',
        submit: '예약 신청', submitting: '제출 중...', fill: '필수 항목을 입력해 주세요', agree_err: '환불 규정에 동의해 주세요',
        success: '✅ 접수됐습니다! 위챗으로 재고·호텔 확인 후 결제 방법을 보내드립니다.', fail: '❌ 제출에 실패했습니다. 잠시 후 다시 시도해 주세요.',
        qr: '위챗을 추가해 주세요. 결제하면 예약이 확정됩니다', qr_hint: '이미지를 길게 눌러 저장',
    },
    en: {
        title: 'Anniversary Party Box',
        beta: 'Beta: launch price for the first 20 bookings. We confirm and take payment on WeChat after you order.',
        hero: 'No tape on the walls, nothing to return — your room turns into a celebration in a minute',
        point1: '🧷 Free-standing pieces — no tape, no house-rule trouble',
        point2: '🛎️ Delivered to the front desk even before check-in',
        point3: '🎁 Everything is yours to keep',
        who: 'Who is it for?',
        kind: 'Hotel room celebration set · delivered to your stay', sample: 'Illustrative image', from: 'from', pick_combo: 'Pick this set', picked: '✓ Selected',
        combo_title: 'Recommended set', base_title: 'Required: base box', opt_title: 'Add-ons (tap to add)', add: 'Add', added: '✓ Added',
        step1: 'Package', step2: 'Add-ons', step3: 'Booking', next: 'Next', back: 'Back', change: 'Change',
        pkg_title: '① Choose a package', pkg_select: 'Choose', pkg_selected: '✓ Chosen', base_note: 'Every package includes:',
        add_title: '② Add extras (optional)', add_sub: 'Add more if you like, or skip straight to the next step', included: 'Included', no_extra: 'No extras',
        info_title: '③ Booking details', your_order: 'Your selection', extra: 'Extras',
        base: 'Required', open_price: 'Launch price', options: 'Add-ons',
        minutes: 'About {n} min to set up yourself', minutes_over: '⚠️ About {n} min — longer than a 10-minute shower. Drop a few add-ons, or let us set it up.',
        combo_apply: 'Pick this',
        delivery: 'How do you want to receive it?', setup_way: 'How we get into the room',
        setup_note: 'You book the room yourself; the price does not include accommodation. Tell us the hotel and we will check whether items can be brought in, when we can set up and what the hotel needs.',
        setup_full: 'Set-up for this date is fully booked (one per day). Pick another date or another delivery option.',
        stay_type: 'Accommodation', stay_hotel: 'Hotel', stay_airbnb: 'Airbnb / guesthouse', stay_other: 'Other',
        stay_name: 'Name of the place', stay_name_ph: 'e.g. The Shilla Jeju / Airbnb link',
        stay_addr: 'Address (required for Airbnb)', stay_addr_ph: 'Korean or English address',
        area_note: 'We deliver in Jeju City only for now. For other areas, note it below and we will discuss on WeChat.',
        date: 'Date', checkin: 'Check-in time', booker: 'Name on the booking', booker_ph: 'For the front desk (as on the booking)',
        wechat: 'WeChat ID', wechat_ph: 'Enter your WeChat ID',
        surprise: "It's a surprise — contact me discreetly",
        card: 'Message card', card_ph: 'What should the card say?',
        lettering: 'Balloon lettering', lettering_ph: 'e.g. HAPPY 1st ANNIVERSARY',
        note: 'Other requests', note_ph: 'Colours, allergies, anything special',
        variable: 'Market price', liquor: 'Drinks you want', liquor_ph: 'e.g. 2 bottles of Hallasan soju, 1 red wine (budget ~¥200)', sum_liquor: 'Drinks', sum_liquor_v: 'Varies · quoted on WeChat', sum_plus: 'drinks extra',
        how_title: 'After it arrives', how1: 'Delivery: left at the front desk or your door as agreed — we message you on WeChat', how2: 'Set-up: follow the guide in the box, about 10 min (fits in your partner\'s shower)', how3: 'Photos: lights off, mood lights on, shoot away', how4: 'Pack up: put the decorations back in the bag before check-out',
        clean: '🧹 Hotel tip: no tape on the walls, all candles are LED (no flame). Bag up petals and balloons before check-out to avoid extra cleaning fees.',
        busy_warn: 'Set-up service is fully booked that day — pick another day or another delivery method',
        sum_items: 'Items', sum_setup: 'Set-up', sum_delivery: 'Delivery', sum_free: 'Free (¥398+)', sum_total: 'Total',
        agree: 'I understand this is made to order. Full refund up to 7 days before / 70% at 4–6 days / 50% at 2–3 days / none from 1 day before. One free date change if your flight is cancelled by weather (with proof).',
        submit: 'Send booking', submitting: 'Sending...', fill: 'Please fill in the required fields', agree_err: 'Please accept the refund policy',
        success: '✅ Received! We will confirm stock and the hotel on WeChat and send you how to pay.', fail: '❌ Could not send. Please try again later.',
        qr: 'Add us on WeChat — your booking is confirmed once paid', qr_hint: 'Long-press to save the QR code',
    },
};

/** 고른 옵션 키·세팅 대행 여부 → 금액 (화면과 API가 같은 계산을 쓴다) */
export function partyQuote(optionKeys = [], setup = false) {
    const picked = PARTY_OPTIONS.filter(o => optionKeys.includes(o.key));
    const items = PARTY_BASE.price + picked.reduce((s, o) => s + o.price, 0);
    const setupFee = setup ? PARTY_SETUP.price : 0;
    const delivery = items >= PARTY_DELIVERY.freeFrom ? 0 : PARTY_DELIVERY.fee;
    const minutes = PARTY_BASE.min + picked.reduce((s, o) => s + o.min, 0);
    return { items, setupFee, delivery, total: items + setupFee + delivery, minutes, picked: picked.map(o => o.key) };
}
