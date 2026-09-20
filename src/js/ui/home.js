// ===== 분실물 홈버튼 → 십자가 배열 토글 =====

    let lostExpanded = false;

    // 서브 버튼 id → 원래 버튼 id 매핑 (서브 버튼을 원래 버튼 앞에 삽입)
    const LOST_REPLACE_MAP = [
        { origId: 'home-hallasan-btn', subId: 'lost-sub-search',   animClass: 'lost-sub-in-top',    outClass: 'lost-sub-out-top' },
        { origId: 'home-festival-btn', subId: 'lost-sub-status',   animClass: 'lost-sub-in-left',   outClass: 'lost-sub-out-left' },
        { origId: 'home-reward-btn',   subId: 'lost-sub-register', animClass: 'lost-sub-in-right',  outClass: 'lost-sub-out-right' },
        { origId: 'home-course-btn',   subId: 'lost-sub-proxy',    animClass: 'lost-sub-in-bottom', outClass: 'lost-sub-out-bottom' },
    ];

    const CORNER_BTN_IDS = ['home-weather-btn', 'home-airport-btn', 'home-food-btn', 'home-reservation-btn'];

    window.toggleLostExpand = function() {
        lostExpanded ? window.collapseLostGrid() : window.expandLostGrid();
    };

    window.expandLostGrid = function() {
        if (window.collapseReservationGrid) window.collapseReservationGrid();
        
        lostExpanded = true;
        document.querySelector('.home-grid').classList.add('lost-expanded-grid');

        LOST_REPLACE_MAP.forEach(function(item, i) {
            var orig = document.getElementById(item.origId);
            var sub  = document.getElementById(item.subId);
            if (!orig || !sub) return;

            // 서브 버튼을 원래 버튼 바로 앞에 이동 (같은 그리드 위치)
            orig.parentNode.insertBefore(sub, orig);
            orig.style.display = 'none';
            sub.style.display = '';
            sub.style.visibility = 'hidden';

            // 딜레이 등장 대신 거의 동시에 가운데에서 퍼져나가게 처리
            setTimeout(function() {
                sub.style.visibility = '';
                sub.classList.add(item.animClass);
            }, i * 30); // 딜레이를 약간 줄여서 역동적으로
        });

        // 2. 모서리 4개 버튼 숨김 (그리드 자리 유지를 위해 visibility 사용)
        CORNER_BTN_IDS.forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.style.visibility = 'hidden';
        });

        // 분실물 버튼 강조 및 뒤로가기로 변경
        var lostBtn = document.getElementById('home-lost-btn');
        if (lostBtn) {
            lostBtn.classList.add('lost-active');
            var icon = lostBtn.querySelector('.item-icon i');
            var label = lostBtn.querySelector('.item-label');
            if (icon) icon.className = 'ph-bold ph-arrow-left color-lost';
            if (label) label.setAttribute('data-i18n', 'lost.home.back');
        }

        // 번역 재적용 (서브 버튼 라벨)
        if (window.applyTranslations) window.applyTranslations();
    }

    window.collapseLostGrid = function() {
        if (!lostExpanded) return;
        lostExpanded = false;
        document.querySelector('.home-grid').classList.remove('lost-expanded-grid');

        LOST_REPLACE_MAP.forEach(function(item) {
            var orig = document.getElementById(item.origId);
            var sub  = document.getElementById(item.subId);
            if (!orig || !sub) return;

            // in 애니메이션 지우고 out 애니메이션 시작
            sub.classList.remove(item.animClass);
            sub.classList.add(item.outClass);

            // 애니메이션 종료(250ms) 후 원위치 복원
            setTimeout(function() {
                sub.style.display = 'none';
                sub.style.visibility = '';
                sub.classList.remove(item.outClass);
                orig.style.display = '';
            }, 250);
        });

        // 분실물 버튼 원래대로 복구 (즉시 변경)
        var lostBtn = document.getElementById('home-lost-btn');
        if (lostBtn) {
            lostBtn.classList.remove('lost-active');
            var icon = lostBtn.querySelector('.item-icon i');
            var label = lostBtn.querySelector('.item-label');
            if (icon) icon.className = 'ph-duotone ph-magnifying-glass color-lost';
            if (label) label.setAttribute('data-i18n', 'nav.lost');
        }

        // 번역 재적용 (분실물 라벨 즉시 복구)
        if (window.applyTranslations) window.applyTranslations();

        // 3. 모서리 4개 버튼 복원 (애니메이션 종류 후 나타나게)
        setTimeout(function() {
            CORNER_BTN_IDS.forEach(function(id) {
                var el = document.getElementById(id);
                if (el) el.style.visibility = '';
            });
        }, 250);
    };

    // 서브 버튼 동작
    window.goToLostSearch = function() {
        window.collapseLostGrid();
        if (window.showSection) window.showSection('lost');
    };

    window.goToLostStatus = function() {
        window.collapseLostGrid();
        if (window.showSection) window.showSection('lost-status');
        if (window.fetchSuccessStories) window.fetchSuccessStories();
    };

    window.goToLostRegister = function() {
        window.collapseLostGrid();
        if (window.openLostReportModal) window.openLostReportModal();
    };

    window.goToLostProxy = function() {
        window.collapseLostGrid();
        if (window.openProxyPickupModal) window.openProxyPickupModal();
        else if (window.showSection) window.showSection('pickup');
    };

    // ===== 예약신청 홈버튼 → 8개 서브버튼 토글 =====

    let reservationExpanded = false;

    // 서브버튼 id → 원래 버튼 id 매핑 (나머지 8칸 전체 대체)
    const RES_REPLACE_MAP = [
        { origId: 'home-weather-btn',   subId: 'res-sub-beauty',     animClass: 'lost-sub-in-top',    outClass: 'lost-sub-out-top' },
        { origId: 'home-hallasan-btn',  subId: 'res-sub-restaurant', animClass: 'lost-sub-in-top',    outClass: 'lost-sub-out-top' },
        { origId: 'home-airport-btn',   subId: 'res-sub-activity',   animClass: 'lost-sub-in-top',    outClass: 'lost-sub-out-top' },
        { origId: 'home-festival-btn',  subId: 'res-sub-skin',       animClass: 'lost-sub-in-left',   outClass: 'lost-sub-out-left' },
        { origId: 'home-lost-btn',      subId: 'res-sub-cloth',      animClass: 'lost-sub-in-right',  outClass: 'lost-sub-out-right' },
        { origId: 'home-reward-btn',    subId: 'res-sub-snap',       animClass: 'lost-sub-in-right',  outClass: 'lost-sub-out-right' },
        { origId: 'home-food-btn',      subId: 'res-sub-rental',     animClass: 'lost-sub-in-bottom', outClass: 'lost-sub-out-bottom' },
        { origId: 'home-course-btn',    subId: 'res-sub-other',      animClass: 'lost-sub-in-bottom', outClass: 'lost-sub-out-bottom' },
    ];

    window.toggleReservationExpand = function() {
        reservationExpanded ? window.collapseReservationGrid() : window.expandReservationGrid();
    };

    window.expandReservationGrid = function() {
        // 분실물이 열려있으면 먼저 닫기
        if (window.collapseLostGrid) window.collapseLostGrid();

        reservationExpanded = true;
        document.querySelector('.home-grid').classList.add('res-expanded-grid');

        RES_REPLACE_MAP.forEach(function(item, i) {
            var orig = document.getElementById(item.origId);
            var sub  = document.getElementById(item.subId);
            if (!orig || !sub) return;

            // 서브 버튼을 원래 버튼 바로 앞에 이동 (같은 그리드 위치)
            orig.parentNode.insertBefore(sub, orig);
            orig.style.display = 'none';
            sub.style.display = '';
            sub.style.visibility = 'hidden';

            setTimeout(function() {
                sub.style.visibility = '';
                sub.classList.add(item.animClass);
            }, i * 30);
        });

        // 예약신청 버튼 강조 및 뒤로가기로 변경
        var resBtn = document.getElementById('home-reservation-btn');
        if (resBtn) {
            resBtn.classList.add('reservation-active');
            var icon  = resBtn.querySelector('.item-icon i');
            var label = resBtn.querySelector('.item-label');
            if (icon)  icon.className = 'ph-bold ph-arrow-left color-reservation';
            if (label) label.setAttribute('data-i18n', 'res.back');
        }

        // 번역 재적용 (서브 버튼 라벨)
        if (window.applyTranslations) window.applyTranslations();
    };

    window.collapseReservationGrid = function() {
        if (!reservationExpanded) return;
        reservationExpanded = false;
        document.querySelector('.home-grid').classList.remove('res-expanded-grid');

        RES_REPLACE_MAP.forEach(function(item) {
            var orig = document.getElementById(item.origId);
            var sub  = document.getElementById(item.subId);
            if (!orig || !sub) return;

            sub.classList.remove(item.animClass);
            sub.classList.add(item.outClass);

            setTimeout(function() {
                sub.style.display = 'none';
                sub.style.visibility = '';
                sub.classList.remove(item.outClass);
                orig.style.display = '';
            }, 250);
        });

        // 예약신청 버튼 원래대로 복구
        var resBtn = document.getElementById('home-reservation-btn');
        if (resBtn) {
            resBtn.classList.remove('reservation-active');
            var icon  = resBtn.querySelector('.item-icon i');
            var label = resBtn.querySelector('.item-label');
            if (icon) icon.className = 'ph-duotone ph-calendar-check color-reservation';
            if (label) label.setAttribute('data-i18n', 'nav.reservation');
        }

        if (window.applyTranslations) window.applyTranslations();
    };

    // 예약 서브 버튼 동작 (기본값 설정 후 페이지 이동)
    window.goToReservation = function(type) {
        window.currentReservationType = type;
        window.collapseReservationGrid();
        if (window.showSection) window.showSection('reservation');
    };