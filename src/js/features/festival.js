import { CONFIG } from '../core/config.js';

let currentFestivalMonth = '';

export function initMonthFilter() {
    const filterContainer = document.getElementById('month-filter');
    if (!filterContainer) return;

    const now = new Date();
    const months = [];
    for (let i = 0; i < 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        months.push({ ym, label: `${d.getMonth() + 1}${window.t('festival.month_suffix')}` });
    }

    if (!currentFestivalMonth) currentFestivalMonth = months[0].ym;

    filterContainer.innerHTML = months.map(m => `
        <div class="month-tab ${m.ym === currentFestivalMonth ? 'active' : ''}" 
             onclick="selectFestivalMonth('${m.ym}')" data-ym="${m.ym}">${m.label}</div>`).join('');

    const rangeInput = document.getElementById('festival-date-range');
    if (rangeInput && typeof flatpickr !== 'undefined' && !rangeInput._flatpickr) {
        const lang = window.getLang ? window.getLang() : 'ko';
        const locale = lang === 'zh-CN' || lang === 'zh' ? 'zh' : (lang === 'en' ? 'en' : 'ko');
        
        flatpickr(rangeInput, {
            mode: "range",
            dateFormat: "Y-m-d",
            locale: locale,
            onChange: function(selectedDates, dateStr, instance) {
                const startInput = document.getElementById('festival-date-start');
                const endInput = document.getElementById('festival-date-end');
                if (selectedDates.length === 2) {
                    const offset = selectedDates[0].getTimezoneOffset() * 60000;
                    startInput.value = (new Date(selectedDates[0].getTime() - offset)).toISOString().split('T')[0];
                    endInput.value = (new Date(selectedDates[1].getTime() - offset)).toISOString().split('T')[0];
                    handleDateChange();
                } else if (selectedDates.length === 0) {
                    startInput.value = '';
                    endInput.value = '';
                    handleDateChange();
                }
            }
        });
    }
}

export function selectFestivalMonth(ym) {
    console.log('Selecting festival month:', ym);
    currentFestivalMonth = ym;
    document.querySelectorAll('.month-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.ym === ym);
    });
    fetchFestivals();
}

export async function fetchFestivals() {
    const listContainer = document.getElementById('festival-list');
    if (!listContainer) return;

    if (!window.FESTIVAL_DATA || !window.FESTIVAL_DATA.months) {
        renderFestivalNotice(listContainer);
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    const startDateInput = document.getElementById('festival-date-start');
    const endDateInput = document.getElementById('festival-date-end');
    
    const startDateStr = startDateInput && startDateInput.value ? startDateInput.value : null;
    const endDateStr = endDateInput && endDateInput.value ? endDateInput.value : null;
    const hasDateSearch = startDateStr || endDateStr;

    let activeItems = [];
    
    if (hasDateSearch) {
        for (const month in window.FESTIVAL_DATA.months) {
            const items = window.FESTIVAL_DATA.months[month];
            items.forEach(item => {
                if (isPeriodOverlap(startDateStr, endDateStr, item.period)) {
                    if (!activeItems.find(a => a.title === item.title)) {
                        activeItems.push(item);
                    }
                }
            });
        }
    } else {
        const monthData = window.FESTIVAL_DATA.months[currentFestivalMonth] || [];
        activeItems = monthData.filter(item => {
            if (!item.period || !item.period.includes('~')) return true;
            const endPart = item.period.split('~')[1].trim();
            const endDate = endPart.replace(/\./g, '-');
            return new Date(endDate) >= new Date(today);
        });
    }

    if (activeItems.length === 0) {
        const monthNum = currentFestivalMonth.split('-')[1];
        const monthSuffix = window.t ? window.t('festival.month_suffix') : '월';
        const monthStr = `${parseInt(monthNum)}${monthSuffix}`;
        
        let msg = '';
        if (hasDateSearch) {
            msg = window.t ? window.t('festival.empty.date') || '해당 기간에 진행되는 축제가 없습니다.' : '해당 기간에 진행되는 축제가 없습니다.';
        } else {
            msg = window.t ? window.t('festival.empty.list').replace('{month}', monthStr) : `${monthStr}에 진행중인 축제가 없습니다.`;
        }
        
        listContainer.innerHTML = `
            <div style="text-align:center;padding:40px;color:var(--text-muted)">
                ${msg}
            </div>`;
    } else {
        renderFestivalItems(listContainer, activeItems);
    }

    const countContainer = document.getElementById('festival-result-count');
    if (countContainer) {
        const totalStr = window.t && window.t('festival.result.count') !== 'festival.result.count' 
            ? window.t('festival.result.count').replace('{count}', activeItems.length) 
            : `총 <span class="highlight">${activeItems.length}</span>건이 검색되었습니다.`;
        countContainer.innerHTML = totalStr;
        countContainer.style.display = 'block';
    }
}

function isPeriodOverlap(searchStartStr, searchEndStr, periodStr) {
    if (!periodStr) return false;
    
    let searchStart = searchStartStr ? new Date(searchStartStr).getTime() : -Infinity;
    let searchEnd = searchEndStr ? new Date(searchEndStr).getTime() : Infinity;
    
    if (searchEndStr) {
        const d = new Date(searchEndStr);
        d.setHours(23,59,59,999);
        searchEnd = d.getTime();
    }
    
    let festStart, festEnd;
    
    if (periodStr.includes('~')) {
        const parts = periodStr.split('~');
        let startStr = parts[0].trim().replace(/\./g, '-');
        let endStr = parts[1].trim().replace(/\./g, '-');
        
        if (endStr.length <= 5 && startStr.length >= 4) {
            const year = startStr.substring(0, 4);
            endStr = `${year}-${endStr}`;
        }
        
        festStart = new Date(startStr).getTime();
        const d = new Date(endStr);
        d.setHours(23,59,59,999);
        festEnd = d.getTime();
    } else {
        const exactDate = new Date(periodStr.trim().replace(/\./g, '-'));
        festStart = exactDate.getTime();
        exactDate.setHours(23,59,59,999);
        festEnd = exactDate.getTime();
    }
    
    return searchStart <= festEnd && searchEnd >= festStart;
}

export function handleDateChange() {
    const startDateInput = document.getElementById('festival-date-start');
    const endDateInput = document.getElementById('festival-date-end');
    
    const startDateStr = startDateInput && startDateInput.value ? startDateInput.value : null;
    const endDateStr = endDateInput && endDateInput.value ? endDateInput.value : null;
    
    const targetDateStr = startDateStr || endDateStr;
    
    if (targetDateStr) {
        const selectedDate = new Date(targetDateStr);
        if (!isNaN(selectedDate.getTime())) {
            const ym = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
            
            if (currentFestivalMonth !== ym) {
                currentFestivalMonth = ym;
                document.querySelectorAll('.month-tab').forEach(tab => {
                    tab.classList.toggle('active', tab.dataset.ym === ym);
                });
            }
        }
    }
    
    fetchFestivals();
}

export function clearDateSearch() {
    const startDateInput = document.getElementById('festival-date-start');
    const endDateInput = document.getElementById('festival-date-end');
    const rangeInput = document.getElementById('festival-date-range');
    if (startDateInput) startDateInput.value = '';
    if (endDateInput) endDateInput.value = '';
    if (rangeInput && rangeInput._flatpickr) {
        rangeInput._flatpickr.clear();
    }
    fetchFestivals();
}

export function renderFestivalNotice(container) {
    container.innerHTML = `
        <div class="festival-notice-container">
            <div class="festival-notice-card">
                <div class="notice-icon"><i class="ph-duotone ph-calendar color-festival"></i></div>
                <h3 class="notice-title">${window.t('festival.loading.notice')}</h3>
            </div>
        </div>
    `;
}

const FESTIVAL_TRANSLATIONS = {
    // === 기존 번역 (v1 ~ v6) ===
    '한라수목원과 함께하는 주말 자연생태체험 프로그램': '汉拿树木园周末自然生态体验',
    '2026년 기상기후 사진 전시회': '2026年气象气候摄影展',
    '2026 블키의 모찌공방': '2026 Blki的麻薯工坊',
    '2026 봄줍 : 봄을 줍는 여행길': '2026 拾春：拾起春天的旅行之路',
    '2026년 제주교육박물관 「문화가 있는 날」': '2026年济州教育博物馆「文化日」',
    '한림공원 튤립축제': '翰林公园郁金香节',
    '제주 유채꽃 축제': '济州油菜花节',
    '가파도 청보리 축제': '加波岛青麦节',
    '제78주년 4.3 예술축전 창작극': '第78周年4.3艺术节创作剧',
    '2026 제주경향하우징페어': '2026 济州京乡住房博览会',
    '제30회 한라산 청정 고사리축제': '第30届汉拿山清净蕨菜节',
    '제19회 전농로왕벚꽃축제': '第19届典农路大王樱花节',
    '제28회 서귀포 유채꽃 국제걷기대회': '第28届西归浦油菜花国际步行大会',
    '제주북페어 2026': '济州书展 2026',
    '2026 작가의 산책길 이야기 탐방': '2026 作家散步道故事探訪',
    '작가의 산책길 2026! 봄을 여는 서귀포 생활문화예술 축제': '2026作家散步道！开启春天的西归浦生活文化艺术节',
    '진행중': '进行中',
    '진행예정': '即将开始',
    '보롬왓 튤립 축제': 'Borumwat 郁金香节',
    '소노 런트립 180K in JEJU': 'Sono Run Trip 180K in 济州',
    '제3회 신풍벚꽃터널축제': '第3届新丰樱花隧道节',
    '제43회 서귀포 유채꽃 축제': '第43届西归浦油菜花节',
    '제15회 서귀포 봄맞이축제': '第15届西归浦迎春节',
    '제15회 가파도 청보리 축제': '第15届加波岛青麦节',
    '제주마 입목문화축제': '济州马放牧文化节',
    '네 번째, 오물교에 봄이 왔서홍!': '第四届五물桥春天来了！',
    '서귀포 원도심 문화페스티벌': '西归浦原都心文化节',
    '제1회 반려견과 함께하는 조수리 \'좋아요런\'': '第一届伴侣犬좋아요런',
    '2026 제주 빵빵런': '2026 济州面包跑',
    '2026 펠롱펠롱 제주올레 글로벌 어린이걷기축제': '2026 闪耀济州偶来全球儿童徒步节',
    '2026 JFWF 제주푸드앤와인페스티벌': '2026 济州美食艺术与葡萄酒节',
    '에코랜드 좀비 트레인:제주행 리부트': 'ECO Land 僵尸列车：济州行',
    '판타지 포레스트 With Friends': 'Fantasy Forest 与朋友们',
    '제주국제관광마라톤축제': '济州国际观光马拉松赛',
    '제주세계청소년합창축제': '济州世界青少年合唱节',
    '이호 필터 페스티벌': '梨湖 Filter 庆典',
    '카멜리아힐 수국 축제': 'Camellia Hill 绣球花节',
    '컬러풀 산지 페스티벌': '多姿多彩山地川庆典',
    '서귀포 오페라 페스티벌': '西归浦歌剧节',
    // === 신규 번역 (2026-05-25 크롤링 데이터 기반) ===
    '2026 제주 국가유산 방문의 해': '2026 济州国家遗产访问年',
    '제주날씨 순간포착! 제주에 이런 날씨가': '济州天气瞬间捕捉！济州竟有这样的天气',
    '「계절이 들리는 원도심」 (2026 버스킹 있는 날 in 제주시)': '「听见季节的老城区」(2026 济州市街头演出日)',
    '제주김녕미로공원 2026 김녕고양이왕국 체험경제 SEASON2 고양이기사단 대모험': '济州金宁迷宫公园 2026 猫咪王国大冒险 SEASON2',
    '휴애리 수국축제': '休爱里绣球花节',
    '안전 인증 농어촌민박 이용 다자녀가구 제주여행 환영 캠페인': '安全认证农渔村民宿 多子女家庭济州旅行欢迎活动',
    '2026년 새연교 음악분수': '2026年赛缘桥音乐喷泉',
    '2026 새연교 주말 문화공연 『금토금토 새연쇼』': '2026 赛缘桥周末文化演出「金土金土 赛缘秀」',
    '감귤박물관 특별 웹툰 기획전 "기후위기감귤:제주감귤이야기"': '柑橘博物馆特别漫画企划展「气候危机柑橘：济州柑橘故事」',
    '2026 도전! J-스타트업 참가자 모집': '2026 挑战！J-创业参与者招募',
    '탐나오 더-제주 포시즌 The blooming Jeju': '耽罗 The Blooming Jeju 四季济州',
    '화산암반수 원정대': '火山岩盘水探险队',
    '2026 제주 수공예 놀이터': '2026 济州手工艺乐园',
    'THETIS 8인 작가 초대전': 'THETIS 8位作家邀请展',
    '칠십리, 예술의 바람 속으로': '七十里，走进艺术之风',
    '더더플리마켓': 'The The 跳蚤市场',
    '제6회 여름꽃&능소화축제': '第6届夏花&凌霄花节',
    '고광민 사진\xB7도구기획전 <물질, 제주 해녀의 갯곳 생활>': '高光民摄影工具企划展「海女的潮间带生活」',
    '카메라, 멩두 전시연계 프로그램': '相机，面对 展览联动项目',
    '제주 김녕 빵빵런': '济州金宁面包跑',
    '제주신화월드 [블랙홀 엑시트] 제1회 코인 사냥 대회': '济州神话世界「黑洞逃脱」第1届硬币猎人大赛',
    '제 7회 평화의마을 소시지축제': '第7届和平村香肠节',
    '마을미식 페스티벌 7인의 셰프, 7개의 마을식당': '村庄美食节 7位厨师，7家村庄餐厅',
    '2026 세계명곡과 함께하는 음악여행': '2026 与世界名曲同行的音乐之旅',
    '제주 해설 & 드로잉 여행 <서귀포를 그리는 시간>': '济州解说&绘画之旅「描绘西归浦的时光」',
    '제2회 함께달리개 : 기부런': '第2届一起跑：公益跑',
    '2026 러닝위크 인 제주 (RUNNING WEEK IN JEJU)': '2026 济州跑步周 (RUNNING WEEK IN JEJU)',
    '제주주간': '济州周',
    '제30회 제주국제관광마라톤축제': '第30届济州国际观光马拉松节',
    '청수곶자왈 반딧불이 축제': '清水곶자왈萤火虫节',
    '2026 제주 글로벌 푸드테크 엑스포': '2026 济州全球食品科技博览会',
    '2026 제주잇수다': '2026 济州闲聊',
    '2026 제주예술문화축전': '2026 济州艺术文化节',
    'K-Dream Dance Festa in JEJU': 'K-Dream Dance Festa in 济州',
    '수산리 사탕옥수수 대잔치 : 옥수수처럼 달콤한 여름날의 마을잔치': '水山里甜玉米盛宴：如玉米般甜蜜的夏日村庄庆典',
    '제13회 세계인 제주 외국인 커뮤니티 제전': '第13届世界人济州外国人社区庆典',
    '2026 산호학교 \'제주바다를 기록해요\'': '2026 珊瑚学校「记录济州的海」',
    '에코랜드 곶자왈 도르라 트레일런': 'ECO Land 곶자왈 Dorra越野跑',
    '[한라산아래첫마을영농조합법인] 2026제주메밀축제 "제주메밀의 모든 것"': '「汉拿山下第一村」2026济州荞麦节',
    '제주 고향사랑기부제 5월 종소세 신고기간 애플망고 추가 증정 이벤트': '济州故乡爱心捐赠 5月综合所得税申报 苹果芒果赠送活动',
    '[탐나는 마켓 \u00D7 슬로우 빌리지] 5월의 베리 슬로우': '「耽罗市集 x 慢村庄」5月的Very Slow',
    // === 추가 번역 (2026-07) ===
    '그래비티 퀘스트 제주 2026': 'Gravity Quest 济州 2026',
    '김택화 : 제주의 풍경展': '金泽和：济州风景展',
    '제156회 특별전 <뜻을 품은 그림 민화>': '第156届特别展《怀揣意蕴的画作，民画》',
    '내 꿈은 <KBO 981리그> 응원단장': '我的梦想是<KBO 981联赛>啦啦队长',
    '2026 원도심 도보투어 (성안올레+별별투어)': '2026 老城区徒步游 (城内偶来+星星之旅)',
    '[2026 상설공연] 제주칠머리당영등굿전수관 상설공연': '[2026 常设演出] 济州七头堂迎神祭传授馆常设演出',
    '남국재견: 제주, 다시 보다': '南国再见：重新发现济州',
    '은은한 문제': '隐约的问题',
    '제주문학관 문학상주작가 홍지이와 함께하는 다정한 글쓰기·책읽기 멘토링': '与驻馆作家洪智伊同行的温情写作·阅读指导',
    '2026 제주목 관아 야간개장': '2026 济州牧官衙夜间开放',
    '한국마사회 제주목장에서 웨딩ㆍ가족 사진 자랑 대회': '韩国马事会济州牧场婚纱·全家福摄影大赛',
    '2026 김만덕기념관 특별기획전 <물길을 따라, 사람길을 잇다>': '2026 金万德纪念馆特别展《顺着水路，连接人路》',
    '저지문화예술인마을 \'제주 서쪽, 저지에서 놀자!\'': '楮旨文化艺术人村“济州西侧，在楮旨玩吧！”',
    '2026 제주 플로깅 참여 활성화 지원사업': '2026 济州环保拾荒跑参与支持项目',
    '[꿈다락 문화예술학교- 제자리에서 오몽하기]': '[梦之阁文化艺术学校- 原地律动]',
    '제주신화야행 살강길': '济州神话夜行 Salgang路',
    '탐나오 제주여행 빅할인!': '耽罗济州旅行大特惠！',
    '"전기차로 Green Drive" 제주를 바꾸는 전기차 렌터카 이용 캠페인': '“纯电 Green Drive”改变济州的电动车租车活动',
    '제주 가심비 맛집 여행 인증 캠페인': '济州高性价比美食之旅打卡活动',
    '고 김영갑 작가 기증 사진전 <찰나의 영원, 제주를 담다>': '已故金永甲作家捐赠摄影展《刹那的永恒，定格济州》',
    '산지천갤러리 윈도우갤러리 상설전시 《SJC 아카이브 윈도우: 푸른 날》': '山地川画廊橱窗画廊常设展《SJC档案橱窗：蔚蓝岁月》',
    '스컵피 Vol.2 Curated by 포엠매거진': 'Scoopy Vol.2 由Poem杂志策划',
    '2026 산호뜨개학교': '2026 珊瑚编织学校',
    '변시지 탄생100주년 기념특별전 《어디서 왔다가 어디로 가는가: 황토빛 사유, 존재의 바람》': '边时志诞辰100周年特别展《从何处来，向何处去》',
    '숨비소리 20년, 바다의 기억을 담다': '海女的呼吸声20年，承载大海的记忆',
    '만화, 시대와 민주주의를 그리다': '漫画，描绘时代与民主主义',
    '국가무형유산 제주칠머리당영등굿 \'요왕맞이+나까시리\'': '国家非遗济州七头堂迎神祭“龙王迎接+Nakkasiri”',
    '안진희 개인전 <제주, 서천꽃밭을 찾아서>': '安珍熙个展《济州，寻找西天花田》',
    '에코랜드 쿨 썸머 워터트레인 시즌3': 'Ecoland 酷夏水上列车 第3季',
    '《역사의 진동》Resonance of History': '《历史的震动》Resonance of History',
    '원피스: 대해적시대전 아시아 투어 in 한국·제주': '海贼王：大海贼时代展亚洲巡演 in 韩国·济州',
    '2026 굿에 울고 굿에 웃다': '2026 在巫术中哭与笑',
    '정유진 개인전 <해녀의 숨, 기계의 숨>': '郑宥珍个展《海女的呼吸，机器的呼吸》',
    '제7회 루씨쏜 아뜰리에 회원전 민화로 꿈피우다展': '第7届Lucysson工作室会员展《用民画放飞梦想》',
    '에코랜드 좀비 트레인:제주행 리부트 6일 개장': 'Ecoland 丧尸列车：济州行重启 6日开放',
    '헌마공신 김만일기념관 - 장덕지 박사 제주馬 사진전': '献马功臣金万镒纪念馆 - 张德智博士济州马摄影展',
    '서귀포공립 소암기념관 특별초대전 <강재희 : 형상 그 너머>': '西归浦公立素菴纪念馆特别邀请展《姜在熙：形象的彼岸》',
    '스튜디오 지브리展 in Jeju X 도토리숲 POP-UP STORE': '吉卜力工作室展 in Jeju X 橡子森林快闪店',
    '2026 문턱없는 콜라보vol.2 〈어디로 Where are we going?〉': '2026 无界限合作vol.2《去哪里 Where are we going?》',
    '오뚜기 세화로': '不倒翁 细花路',
    '[제주특별자치도관광협] 제주미(味)행 Vol. 4-6 (2026.7. / 선착순 마감)': '[济州道观光协会] 济州味行 Vol. 4-6',
    '마음이 알록달록': '斑斓的心',
    'CODE064X02': 'CODE064X02',
    '제주한란전시관 7월 체험 <제주 한란이 피어나는 시간>': '济州寒兰展示馆7月体验《济州寒兰绽放的时光》',
    '김유정의 돌 문화 이야기 다섯 강좌. 돌의 삶-오늘, 어제와 내일의 시간': '金由正的石头文化故事5讲。石头的生命-昨天、今天与明天',
    '김현성 개인전 계절의 계층': '金贤诚个展《季节的阶层》',
    '복날엔 제주에 기부하고, 고기 먹으면 돼지!': '三伏天捐赠济州，吃肉就好！',
    '2026 세계유산 활용프로그램 제주 화산섬과 용암동굴': '2026 世界遗产活用项目：济州火山岛和熔岩洞窟',
    '손종욱 개인전 《Analog Child》': '孙钟旭个展《Analog Child》',
    '김만덕아카데미 1기 수강생 모집': '金万德学院第1期学员招募',
    '엉또그림 한혜민 개인전 《제주, 마음이 머문 바다》': 'Eongtto画 韩惠敏个展《济州，心停驻的海》',
    '空同의 온도': '空同的温度',
    '산지천갤러리 「포토진 워크숍: 우리가 바라본 원도심」': '山地川画廊「图片志工作坊：我们眼中的老城区」',
    '엄마가 보고 있다': '妈妈在看着',
    '진짜를 만나다': '遇见真实',
    '오현단에서 만나는 선비문화 체험': '在五贤坛体验书生文化',
    '설문대여성문화센터 7월 기획공연 「릴보이 X 우디 고차일드 썸머 힙합 페스타」': '雪门台女性文化中心7月企划演出「Lil Boi X Woodie Gochild 酷夏嘻哈盛典」',
    '2026제주수변공원ESG축제': '2026济州水边公园ESG庆典',
    '울림의 경계 너머': '回响的边界之外',
    '\'불턱클럽 제주 × 사우나파라다이스\'': '\'Bulteok俱乐部济州 × 桑拿天堂\'',
    '제주패스파인더 템플스테이 - 무심(無心)제주': '济州探路者寺庙寄宿 - 无心济州',
    '숨비소리 해녀 키링 만들기': '海女呼吸声 钥匙扣制作',
    '2026 제주서예문화축제': '2026 济州书法国粹节',
    '클래식그리다 콘서트 \'뿌띠꼬숑 앙상블 X 김종석\'': '绘制古典音乐会 \'Petit Cochon Ensemble X 金钟硕\'',
    '[스페이스컵X포엠매거진] 향긋한 낭독회 with 황인찬 시인': '[Space Cup X Poem杂志] 芬芳的朗读会 with 诗人黄仁灿',
    '2026 돌고래 마을 노을 축제': '2026 海豚村日落庆典',
    '국악&힙합 퓨전콘서트': '国乐&嘻哈跨界演唱会',
    '제6회 제주호른앙상블 정기연주회': '第6届济州圆号乐团定期演奏会',
    '야외 방탈출 탐탐 판놀이 <잠든 수호신을 깨워라>': '户外密室逃脱<唤醒沉睡的守护神>',
    '제𝟴회 농촌융복합산업 제주국제박람회 푸파페제주': '第8届农村融合产业济州国际博览会',
    '제13회 제주국제크루즈포럼': '第13届济州国际邮轮论坛',
    '귀몽 신화월드': '鬼梦 神话世界',
    '한여름밤의 예술공연 SUMMER ARTS NIGHT': '仲夏夜艺术演出 SUMMER ARTS NIGHT',
    '2026 제주별빛이야기': '2026 济州星空故事',
    '2026 이호필터페스티벌': '2026 梨湖Filter庆典',
    '"여름밤 숲속에서 만나는" 제15회 아라음악회': '“夏夜森林中的相遇”第15届我罗音乐会',
    '2026 길 위의 인문학 제주피스스쿨:혼디 거우는 평화': '2026 路上的人文济州和平学校',
    '유기견 산책 팝업 <펫 미팅>': '流浪狗散步快闪<Pet Meeting>',
    '블랙홀 엑시트 제2회 코인 사냥 대회': '黑洞逃脱第2届硬币猎人大赛',
    '〈2026 인디 안아 Zone\'s〉 LIVE in JEJU': '〈2026 独立音乐 Zone\'s〉 LIVE in JEJU',
    '2026 몽생이 워터월드 : WATER WORLD': '2026 Mongsaengi Water World',
    '[제철미식워크샵] 대서大暑: 제주토종오이 그리고 과하주': '[时令美食工作坊] 大暑：济州土黄瓜与过夏酒',
    '7월 비치 보름달 세레모니': '7月海滩满月仪式',
    '평대 선셋바당 라이브': '坪代日落大海Live',
    '제15회 그린로하스 ESG 제주대전': '第15届绿色LOHAS ESG济州大展',
    '2026 야크마을 밤산책': '2026 Yak村夜间散步',
    '용천수 러닝': '涌泉水跑步',
    '찰리빈웍스 단독공연 : UZUPA LIVE': 'Charlie Bean Works单独演唱会：UZUPA LIVE',
    '제3회 갯것이영화제 × 2026 생태관광주간': '第3届海鲜电影节 × 2026 生态旅游周',
    '손끝에 머문 자연의 색 \'2026 천연염색 한마당 축제\'': '指尖停留的自然色彩\'2026天然染色盛典\'',
    '스테핑스톤페스티벌 2026': 'Stepping Stone Festival 2026',
    '우리가 사랑한 한국영화 OST 콘서트 2026 - 서귀포': '我们热爱的韩国电影OST演唱会2026 - 西归浦',
    '선셋 홀인런 5k': '日落一杆进洞跑 5K',
    '2026 제5회 제주비엔날레 《허그곡 모닥치곡 이야기홍: 변용의 기술》': '2026 第5届济州双年展',
    '제주&교촌 미니벨로 페스타': '济州&校村 Mini Velo Festa',
    '2026 생생 국가유산 활용사업 "멩심헹 성읍에 가게마씀"': '2026 活生生国家遗产活用事业',
    '2026 세계유산축전-제주 화산섬과 용암동굴 유산! 그 너머로(The Inheritance Beyond)': '2026 世界遗产庆典-济州火山岛与熔岩洞窟',
    '제65회 탐라문화제': '第65届耽罗文化节',
    '제32회 서귀포칠십리축제': '第32届西归浦七十里庆典',
    '2026 제주올레걷기축제': '2026 济州偶来徒步节',
    '2026 대한민국 제주정원문화박람회': '2026 大韩民国济州庭院文化博览会'
};

const FESTIVAL_TRANSLATIONS_EN = {
    '한라수목원과 함께하는 주말 자연생태체험 프로그램': 'Weekend Ecology Program in Halla Arboretum',
    '2026년 기상기후 사진 전시회': '2026 Weather & Climate Photo Exhibition',
    '2026 블키의 모찌공방': '2026 Blki\'s Mochi Atelier',
    '2026 봄줍 : 봄을 줍는 여행길': '2026 Spring Gathering Travel',
    '2026년 제주교육박물관 「문화가 있는 날」': '2026 Jeju Education Museum "Culture Day"',
    '한림공원 튤립축제': 'Hallim Park Tulip Festival',
    '제주 유채꽃 축제': 'Jeju Canola Flower Festival',
    '가파도 청보리 축제': 'Gapado Green Barley Festival',
    '제78주년 4.3 예술축전 창작극': '78th 4.3 Art Festival Creative Play',
    '2026 제주경향하우징페어': '2026 Jeju Kyunghyang Housing Fair',
    '제30회 한라산 청정 고사리축제': '30th Hallasan Clean Bracken Festival',
    '제19회 전농로왕벚꽃축제': '19th Jeonnong-ro King Cherry Blossom Festival',
    '제28회 서귀포 유채꽃 국제걷기대회': '28th Seogwipo Canola Flower Int\'l Walking Contest',
    '제주북페어 2026': 'Jeju Book Fair 2026',
    '2026 작가의 산책길 이야기 탐방': '2026 Author\'s Trail Story Tour',
    '작가의 산책길 2026! 봄을 여는 서귀포 생활문화예술 축제': 'Author\'s Trail 2026! Seogwipo Spring Culture & Art Festival',
    '보롬왓 튤립 축제': 'Boromwat Tulip Festival',
    '소노 런트립 180K in JEJU': 'Sono Run Trip 180K in JEJU',
    '제3회 신풍벚꽃터널축제': '3rd Sinpung Cherry Blossom Tunnel Festival',
    '제43회 서귀포 유채꽃 축제': '43rd Seogwipo Canola Flower Festival',
    '제15회 서귀포 봄맞이축제': '15th Seogwipo Spring Welcome Festival',
    '제15회 가파도 청보리 축제': '15th Gapado Green Barley Festival',
    '제주마 입목문화축제': 'Jeju Horse Pasture Culture Festival',
    '네 번째, 오물교에 봄이 왔서홍!': 'Spring at Omulgyo Bridge!',
    '서귀포 원도심 문화페스티벌': 'Seogwipo Downtown Culture Festival',
    '제1회 반려견과 함께하는 조수리 \'좋아요런\'': '1st Josu-ri Running with Dogs',
    '2026 제주 빵빵런': '2026 Jeju Bread Run',
    '2026 펠롱펠롱 제주올레 글로벌 어린이걷기축제': '2026 Jeju Olle Global Children\'s Walking Festival',
    '2026 JFWF 제주푸드앤와인페스티벌': '2026 Jeju Food & Wine Festival',
    '에코랜드 좀비 트레인:제주행 리부트': 'Ecoland Zombie Train',
    '판타지 포레스트 With Friends': 'Fantasy Forest With Friends',
    '제주국제관광마라톤축제': 'Jeju Int\'l Tourism Marathon Festival',
    '제주세계청소년합창축제': 'Jeju World Youth Choral Festival',
    '이호 필터 페스티벌': 'Iho Filter Festival',
    '카멜리아힐 수국 축제': 'Camellia Hill Hydrangea Festival',
    '컬러풀 산지 페스티벌': 'Colorful Sanji Festival',
    '서귀포 오페라 페스티벌': 'Seogwipo Opera Festival',
    '2026 제주 국가유산 방문의 해': '2026 Visit Jeju National Heritage Year',
    '제주날씨 순간포착! 제주에 이런 날씨가': 'Jeju Weather Photo Exhibition',
    '「계절이 들리는 원도심」 (2026 버스킹 있는 날 in 제주시)': 'Busking Day in Jeju City',
    '제주김녕미로공원 2026 김녕고양이왕국 체험경제 SEASON2 고양이기사단 대모험': 'Gimnyeong Maze Park Cat Kingdom 2026',
    '휴애리 수국축제': 'Hueree Hydrangea Festival',
    '안전 인증 농어촌민박 이용 다자녀가구 제주여행 환영 캠페인': 'Safety-certified Guest House Welcome Campaign',
    '2026년 새연교 음악분수': '2026 Saeyeongyo Musical Fountain',
    '2026 새연교 주말 문화공연 『금토금토 새연쇼』': 'Saeyeongyo Weekend Performance "Saeyeo Show"',
    '감귤박물관 특별 웹툰 기획전 "기후위기감귤:제주감귤이야기"': 'Citrus Museum Webtoon Exhibition',
    '2026 도전! J-스타트업 참가자 모집': '2026 Challenge! J-Startup Recruitment',
    '탐나오 더-제주 포시즌 The blooming Jeju': 'Tamnao Blooming Jeju Four Seasons',
    '화산암반수 원정대': 'Volcanic Bedrock Water Expedition',
    '2026 제주 수공예 놀이터': '2026 Jeju Handicraft Playground',
    'THETIS 8인 작가 초대전': 'THETIS 8 Artists Exhibition',
    '칠십리, 예술의 바람 속으로': 'Chilsimni, Into the Wind of Art',
    '더더플리마켓': 'The The Flea Market',
    '제6회 여름꽃&능소화축제': '6th Summer Flower & Trumpet Creeper Festival',
    '고광민 사진\xB7도구기획전 <물질, 제주 해녀의 갯곳 생활>': 'Go Gwang-min Photo Exhibition of Jeju Haenyeo',
    '카메라, 멩두 전시연계 프로그램': 'Camera, Mengdu Exhibition Program',
    '제주 김녕 빵빵런': 'Jeju Gimnyeong Bread Run',
    '제주신화월드 [블랙홀 엑시트] 제1회 코인 사냥 대회': 'Jeju Shinhwa World Coin Hunting Contest',
    '제 7회 평화의마을 소시지축제': '7th Peace Village Sausage Festival',
    '마을미식 페스티벌 7인의 셰프, 7개의 마을식당': 'Village Gastronomy Festival',
    '2026 세계명곡과 함께하는 음악여행': '2026 Music Journey with World Famous Classics',
    '제주 해설 & 드로잉 여행 <서귀포를 그리는 시간>': 'Jeju Drawing Tour <Drawing Seogwipo>',
    '제2회 함께달리개 : 기부런': '2nd Run Together Charity Run',
    '2026 러닝위크 인 제주 (RUNNING WEEK IN JEJU)': '2026 Running Week in Jeju',
    '제주주간': 'Jeju Week',
    '제30회 제주국제관광마라톤축제': '30th Jeju Int\'l Tourism Marathon Festival',
    '청수곶자왈 반딧불이 축제': 'Cheongsu Gotjawal Firefly Festival',
    '2026 제주 글로벌 푸드테크 엑스포': '2026 Jeju Global Foodtech Expo',
    '2026 제주잇수다': '2026 Jeju It-Suda',
    '2026 제주예술문화축전': '2026 Jeju Art & Culture Festival',
    'K-Dream Dance Festa in JEJU': 'K-Dream Dance Festa in JEJU',
    '수산리 사탕옥수수 대잔치 : 옥수수처럼 달콤한 여름날의 마을잔치': 'Susan-ri Sweet Corn Festival',
    '제13회 세계인 제주 외국인 커뮤니티 제전': '13th Jeju Foreign Community Festival',
    '2026 산호학교 \'제주바다를 기록해요\'': '2026 Coral School "Record the Jeju Sea"',
    '에코랜드 곶자왈 도르라 트레일런': 'Ecoland Gotjawal Dorra Trail Run',
    '[한라산아래첫마을영농조합법인] 2026제주메밀축제 "제주메밀의 모든 것"': '2026 Jeju Buckwheat Festival',
    '제주 고향사랑기부제 5월 종소세 신고기간 애플망고 추가 증정 이벤트': 'Jeju Hometown Love Donation Event',
    '[탐나는 마켓 \u00D7 슬로우 빌리지] 5월의 베리 슬로우': 'Tamnana Market x Slow Village Event',
    // === 추가 번역 (2026-07) ===
    '그래비티 퀘스트 제주 2026': 'Gravity Quest Jeju 2026',
    '김택화 : 제주의 풍경展': 'Kim Taek-hwa: Jeju Landscape Exhibition',
    '제156회 특별전 <뜻을 품은 그림 민화>': '156th Special Exhibition <Minhwa, Paintings with Meaning>',
    '내 꿈은 <KBO 981리그> 응원단장': 'My Dream is <KBO 981 League> Cheerleader',
    '2026 원도심 도보투어 (성안올레+별별투어)': '2026 Downtown Walking Tour (Seongan Olle + Byeolbyeol Tour)',
    '[2026 상설공연] 제주칠머리당영등굿전수관 상설공연': '[2026 Regular Performance] Jeju Chilmeoridang Yeongdeunggut',
    '남국재견: 제주, 다시 보다': 'Rediscover Jeju: The Southern Land',
    '은은한 문제': 'Subtle Issues',
    '제주문학관 문학상주작가 홍지이와 함께하는 다정한 글쓰기·책읽기 멘토링': 'Writing & Reading Mentoring with Author Hong Ji-yi',
    '2026 제주목 관아 야간개장': '2026 Jeju Mokgwana Night Opening',
    '한국마사회 제주목장에서 웨딩ㆍ가족 사진 자랑 대회': 'Wedding & Family Photo Contest at KRA Jeju Stud Farm',
    '2026 김만덕기념관 특별기획전 <물길을 따라, 사람길을 잇다>': '2026 Kim Man-deok Memorial Hall Special Exhibition',
    '저지문화예술인마을 \'제주 서쪽, 저지에서 놀자!\'': 'Jeoji Artists\' Village \'Let\'s Play in Jeoji, Western Jeju!\'',
    '2026 제주 플로깅 참여 활성화 지원사업': '2026 Jeju Plogging Support Project',
    '[꿈다락 문화예술학교- 제자리에서 오몽하기]': '[Kkumdarak Culture & Art School - Grooving in Place]',
    '제주신화야행 살강길': 'Jeju Myth Night Walk: Salgang-gil',
    '탐나오 제주여행 빅할인!': 'Tamnao Jeju Travel Mega Discount!',
    '"전기차로 Green Drive" 제주를 바꾸는 전기차 렌터카 이용 캠페인': '\'Green Drive with EV\' Jeju Rental Car Campaign',
    '제주 가심비 맛집 여행 인증 캠페인': 'Jeju Cost-Effective Gourmet Travel Review Campaign',
    '고 김영갑 작가 기증 사진전 <찰나의 영원, 제주를 담다>': 'Late Kim Young-gap Memorial Photo Exhibition',
    '산지천갤러리 윈도우갤러리 상설전시 《SJC 아카이브 윈도우: 푸른 날》': 'Sanjicheon Gallery Window Exhibition: Blue Days',
    '스컵피 Vol.2 Curated by 포엠매거진': 'Scoopy Vol.2 Curated by Poem Magazine',
    '2026 산호뜨개학교': '2026 Coral Knitting School',
    '변시지 탄생100주년 기념특별전 《어디서 왔다가 어디로 가는가: 황토빛 사유, 존재의 바람》': 'Byun Shi-ji 100th Anniversary Special Exhibition',
    '숨비소리 20년, 바다의 기억을 담다': '20 Years of Sumbisori, Capturing Memories of the Sea',
    '만화, 시대와 민주주의를 그리다': 'Comics, Drawing the Era and Democracy',
    '국가무형유산 제주칠머리당영등굿 \'요왕맞이+나까시리\'': 'Jeju Chilmeoridang Yeongdeunggut \'Yowangmaji + Nakkasiri\'',
    '안진희 개인전 <제주, 서천꽃밭을 찾아서>': 'Ahn Jin-hee Solo Exhibition: Finding Seocheon Flower Garden',
    '에코랜드 쿨 썸머 워터트레인 시즌3': 'Ecoland Cool Summer Water Train Season 3',
    '《역사의 진동》Resonance of History': 'Resonance of History',
    '원피스: 대해적시대전 아시아 투어 in 한국·제주': 'One Piece: Great Pirate Era Asia Tour in Jeju',
    '2026 굿에 울고 굿에 웃다': '2026 Crying and Laughing in Gut (Shamanic Ritual)',
    '정유진 개인전 <해녀의 숨, 기계의 숨>': 'Jung Yu-jin Solo Exhibition: Breath of Haenyeo, Breath of Machines',
    '제7회 루씨쏜 아뜰리에 회원전 민화로 꿈피우다展': '7th Lucysson Atelier Members Exhibition',
    '에코랜드 좀비 트레인:제주행 리부트 6일 개장': 'Ecoland Zombie Train: Bound for Jeju Reboot',
    '헌마공신 김만일기념관 - 장덕지 박사 제주馬 사진전': 'Jeju Horse Photo Exhibition by Dr. Jang Deok-ji',
    '서귀포공립 소암기념관 특별초대전 <강재희 : 형상 그 너머>': 'Seogwipo Soam Memorial Hall Special Exhibition: Kang Jae-hee',
    '스튜디오 지브리展 in Jeju X 도토리숲 POP-UP STORE': 'Studio Ghibli Exhibition in Jeju X Acorn Forest Pop-up',
    '2026 문턱없는 콜라보vol.2 〈어디로 Where are we going?〉': '2026 Borderless Collab Vol.2 <Where are we going?>',
    '오뚜기 세화로': 'Ottogi Sehwa-ro',
    '[제주특별자치도관광협] 제주미(味)행 Vol. 4-6 (2026.7. / 선착순 마감)': '[Jeju Tourism Association] Jeju Gourmet Tour Vol. 4-6',
    '마음이 알록달록': 'Colorful Hearts',
    'CODE064X02': 'CODE064X02',
    '제주한란전시관 7월 체험 <제주 한란이 피어나는 시간>': 'Jeju Cold Orchid Exhibition Hall July Experience',
    '김유정의 돌 문화 이야기 다섯 강좌. 돌의 삶-오늘, 어제와 내일의 시간': 'Kim Yoo-jeong\'s Stone Culture Story 5 Lectures',
    '김현성 개인전 계절의 계층': 'Kim Hyun-sung Solo Exhibition: Layers of Seasons',
    '복날엔 제주에 기부하고, 고기 먹으면 돼지!': 'Donate to Jeju on Dog Days and Enjoy Meat!',
    '2026 세계유산 활용프로그램 제주 화산섬과 용암동굴': '2026 World Heritage Utilization Program',
    '손종욱 개인전 《Analog Child》': 'Son Jong-wook Solo Exhibition 《Analog Child》',
    '김만덕아카데미 1기 수강생 모집': 'Kim Man-deok Academy 1st Cohort Recruitment',
    '엉또그림 한혜민 개인전 《제주, 마음이 머문 바다》': 'Han Hye-min Solo Exhibition: Jeju, the Sea Where My Heart Stayed',
    '空同의 온도': 'Temperature of Emptiness',
    '산지천갤러리 「포토진 워크숍: 우리가 바라본 원도심」': 'Sanjicheon Gallery Photo Zine Workshop',
    '엄마가 보고 있다': 'Mom is Watching',
    '진짜를 만나다': 'Meet the Real',
    '오현단에서 만나는 선비문화 체험': 'Seonbi Culture Experience at Ohyeondan',
    '설문대여성문화센터 7월 기획공연 「릴보이 X 우디 고차일드 썸머 힙합 페스타」': 'Lil Boi X Woodie Gochild Summer Hip-hop Festa',
    '2026제주수변공원ESG축제': '2026 Jeju Waterfront Park ESG Festival',
    '울림의 경계 너머': 'Beyond the Boundaries of Resonance',
    '\'불턱클럽 제주 × 사우나파라다이스\'': '\'Bulteok Club Jeju × Sauna Paradise\'',
    '제주패스파인더 템플스테이 - 무심(無心)제주': 'Jeju Pathfinder Templestay',
    '숨비소리 해녀 키링 만들기': 'Sumbisori Haenyeo Keyring Making',
    '2026 제주서예문화축제': '2026 Jeju Calligraphy Culture Festival',
    '클래식그리다 콘서트 \'뿌띠꼬숑 앙상블 X 김종석\'': 'Classic Drawing Concert: Petit Cochon Ensemble',
    '[스페이스컵X포엠매거진] 향긋한 낭독회 with 황인찬 시인': 'Fragrant Poetry Reading with Poet Hwang In-chan',
    '2026 돌고래 마을 노을 축제': '2026 Dolphin Village Sunset Festival',
    '국악&힙합 퓨전콘서트': 'Korean Traditional Music & Hip-hop Fusion Concert',
    '제6회 제주호른앙상블 정기연주회': '6th Jeju Horn Ensemble Regular Concert',
    '야외 방탈출 탐탐 판놀이 <잠든 수호신을 깨워라>': 'Outdoor Escape Game: Awaken the Sleeping Guardian',
    '제𝟴회 농촌융복합산업 제주국제박람회 푸파페제주': '8th Jeju International Rural Convergence Industry Expo',
    '제13회 제주국제크루즈포럼': '13th Jeju International Cruise Forum',
    '귀몽 신화월드': 'Ghost Dream Shinhwa World',
    '한여름밤의 예술공연 SUMMER ARTS NIGHT': 'Summer Arts Night',
    '2026 제주별빛이야기': '2026 Jeju Starlight Story',
    '2026 이호필터페스티벌': '2026 Iho Filter Festival',
    '"여름밤 숲속에서 만나는" 제15회 아라음악회': '15th Ara Music Concert in the Summer Night Forest',
    '2026 길 위의 인문학 제주피스스쿨:혼디 거우는 평화': '2026 Jeju Peace School: Peace on the Road',
    '유기견 산책 팝업 <펫 미팅>': 'Rescue Dog Walk Pop-up <Pet Meeting>',
    '블랙홀 엑시트 제2회 코인 사냥 대회': 'Black Hole Exit 2nd Coin Hunting Contest',
    '〈2026 인디 안아 Zone\'s〉 LIVE in JEJU': '〈2026 Indie Hug Zone\'s〉 LIVE in JEJU',
    '2026 몽생이 워터월드 : WATER WORLD': '2026 Mongsaengi Water World',
    '[제철미식워크샵] 대서大暑: 제주토종오이 그리고 과하주': 'Seasonal Gastronomy Workshop: Major Heat',
    '7월 비치 보름달 세레모니': 'July Beach Full Moon Ceremony',
    '평대 선셋바당 라이브': 'Pyeongdae Sunset Ocean Live',
    '제15회 그린로하스 ESG 제주대전': '15th Green LOHAS ESG Jeju Expo',
    '2026 야크마을 밤산책': '2026 Yak Village Night Walk',
    '용천수 러닝': 'Yongcheonsu Spring Water Running',
    '찰리빈웍스 단독공연 : UZUPA LIVE': 'Charlie Bean Works Solo Concert: UZUPA LIVE',
    '제3회 갯것이영화제 × 2026 생태관광주간': '3rd Gaetgeosi Film Festival × 2026 Eco-Tourism Week',
    '손끝에 머문 자연의 색 \'2026 천연염색 한마당 축제\'': '2026 Natural Dyeing Festival',
    '스테핑스톤페스티벌 2026': 'Stepping Stone Festival 2026',
    '우리가 사랑한 한국영화 OST 콘서트 2026 - 서귀포': 'Korean Movie OST Concert 2026 - Seogwipo',
    '선셋 홀인런 5k': 'Sunset Hole-in-Run 5K',
    '2026 제5회 제주비엔날레 《허그곡 모닥치곡 이야기홍: 변용의 기술》': '2026 5th Jeju Biennale',
    '제주&교촌 미니벨로 페스타': 'Jeju & Kyochon Mini Velo Festa',
    '2026 생생 국가유산 활용사업 "멩심헹 성읍에 가게마씀"': '2026 Vivid National Heritage Utilization Project',
    '2026 세계유산축전-제주 화산섬과 용암동굴 유산! 그 너머로(The Inheritance Beyond)': '2026 World Heritage Festival: Jeju Volcanic Island',
    '제65회 탐라문화제': '65th Tamna Culture Festival',
    '제32회 서귀포칠십리축제': '32nd Seogwipo Chilsimni Festival',
    '2026 제주올레걷기축제': '2026 Jeju Olle Walking Festival',
    '2026 대한민국 제주정원문화박람회': '2026 Korea Jeju Garden Culture Expo'
};

const FESTIVAL_IMAGE_MAP = {
    "한라수목원": "https://api.cdn.visitjeju.net/photomng/thumbnailpath/202603/20/480650a6-a6f0-4bff-b310-6491cb1fecab.webp",
    "기상기후": "https://api.cdn.visitjeju.net/photomng/thumbnailpath/202603/25/de292028-ac2f-4d9b-bdf8-e56c1298acf7.webp",
    "모찌공방": "https://api.cdn.visitjeju.net/photomng/thumbnailpath/202603/12/1fd4248a-82a5-4c29-85ee-6e31f89aa0ab.jpg",
    "봄줍": "https://api.cdn.visitjeju.net/photomng/thumbnailpath/202602/26/d3e6aeec-7888-4600-90a4-a499acb4fde7.webp",
    "문화가 있는 날": "https://api.cdn.visitjeju.net/photomng/thumbnailpath/202603/12/83a0f4bb-5d75-46b2-bad2-ead172b892e4.webp",
    "에코랜드": "https://api.cdn.visitjeju.net/photomng/thumbnailpath/202604/10/ec825e12-c750-446e-a972-1a5473e84a30.webp",
    "판타지 포레스트": "https://api.cdn.visitjeju.net/photomng/thumbnailpath/202604/05/8c825e12-c750-446e-a972-1a5473e84a30.webp",
    "마라톤": "https://api.cdn.visitjeju.net/photomng/thumbnailpath/202404/08/3987eef0-d52c-4a75-baeb-68df967e60f2.webp",
    "합창": "https://api.cdn.visitjeju.net/photomng/thumbnailpath/202603/20/480650a6-a6f0-4bff-b310-6491cb1fecab.webp",
    "수국": "https://api.cdn.visitjeju.net/photomng/thumbnailpath/202603/12/83a0f4bb-5d75-46b2-bad2-ead172b892e4.webp",
    "오페라": "https://api.cdn.visitjeju.net/photomng/thumbnailpath/202603/25/de292028-ac2f-4d9b-bdf8-e56c1298acf7.webp"
};

function getFestivalImage(title, originalImg) {
    if (originalImg && originalImg.trim() !== '') return originalImg;
    for (const key in FESTIVAL_IMAGE_MAP) {
        if (title.includes(key)) return FESTIVAL_IMAGE_MAP[key];
    }
    return '';
}

export function renderFestivalItems(container, items) {
    const today = new Date().toISOString().split('T')[0];
    const noImg = 'https://images.unsplash.com/photo-1518005020251-582c7edff267?auto=format&fit=crop&w=500&q=80';
    const lang = window.getLang ? window.getLang() : 'zh';

    container.innerHTML = items.map(item => {
        const rawTitle = item.title || window.t('festival.no_title');
        let displayTitle = rawTitle;
        if (lang === 'ko') {
            displayTitle = rawTitle;
        } else if (lang === 'en') {
            displayTitle = FESTIVAL_TRANSLATIONS_EN[rawTitle] || rawTitle;
        } else { // 'zh'
            displayTitle = FESTIVAL_TRANSLATIONS[rawTitle] || rawTitle;
        }
        const rawImg = item.thumbnail || item.imgpath || item.img || '';
        const img = getFestivalImage(rawTitle, rawImg) || noImg;
        
        const rawDate = item.period || item.date || '';
        let displayDate = rawDate;
        if (displayDate.includes('~')) {
            const parts = displayDate.split('~');
            const start = parts[0].trim();
            let end = parts[1].trim();
            if (start === end) {
                displayDate = start;
            } else {
                const startYearMatch = start.match(/^(\d{4})\./);
                const endYearMatch = end.match(/^(\d{4})\./);
                if (startYearMatch && endYearMatch && startYearMatch[1] === endYearMatch[1]) {
                    end = end.substring(5);
                }
                displayDate = `${start} ~ ${end}`;
            }
        }
        const date = rawDate; // Keep original for logic
        let link = item.link;
        if (link) {
            let langPath = 'kr';
            if (lang === 'zh') langPath = 'cn';
            else if (lang === 'en') langPath = 'en';
            link = link.replace('/kr/', `/${langPath}/`);
        } else {
            const yearParts = currentFestivalMonth.split('-');
            const yearStr = yearParts[0] || '2026';
            const monthStr = yearParts[1] || '04';
            const langPath = lang === 'zh' ? 'cn' : (lang === 'en' ? 'en' : 'kr');
            link = `https://visitjeju.net/${langPath}/festival/list#p1&year=${yearStr}&month=${monthStr}&state=all`;
        }
        
        let statusText = window.t('festival.status.ing');
        let statusClass = 'ing';
        
        // Priority status from data
        if (item.status === 'upcoming') {
            statusText = window.t('festival.status.upcoming');
            statusClass = 'upcoming';
        } else if (date.includes('~')) {
            const startPart = date.split('~')[0].trim();
            const startDate = startPart.replace(/\./g, '-');
            if (new Date(startDate) > new Date(today)) {
                statusText = window.t('festival.status.upcoming');
                statusClass = 'upcoming';
            }
        }
        
        return `
            <div class="festival-card" onclick="window.open('${link}', '_blank')">
                <div class="festival-img">
                    <img src="${img}" alt="${displayTitle}" loading="lazy" onerror="this.onerror=null; this.src='${noImg}';" />
                    <span class="tag ${statusClass}">${statusText}</span>
                </div>
                <div class="festival-info">
                    <h3 class="festival-title">${displayTitle}</h3>
                    <div class="festival-date">
                        ${displayDate}
                    </div>
                </div>
            </div>`;
    }).join('');
}

window.festivalApp = {
    initMonthFilter: initMonthFilter,
    fetchFestivals: fetchFestivals,
    handleDateChange: handleDateChange,
    clearDateSearch: clearDateSearch
};
