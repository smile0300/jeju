// ===== 분실물 홈버튼 → 십자가 배열 토글 =====

    let lostExpanded = false;

    // 서브 버튼 id → 원래 버튼 id 매핑 (서브 버튼을 원래 버튼 앞에 삽입)
    const LOST_REPLACE_MAP = [
        { origId: 'home-hallasan-btn', subId: 'lost-sub-search',   animClass: 'lost-sub-in-top',    outClass: 'lost-sub-out-top' },
        { origId: 'home-festival-btn', subId: 'lost-sub-status',   animClass: 'lost-sub-in-left',   outClass: 'lost-sub-out-left' },
        { origId: 'home-reservation-btn', subId: 'lost-sub-register', animClass: 'lost-sub-in-right',  outClass: 'lost-sub-out-right' }, // 가운데 오른쪽 칸 = 예약신청
        { origId: 'home-food-btn',     subId: 'lost-sub-proxy',    animClass: 'lost-sub-in-bottom', outClass: 'lost-sub-out-bottom' }, // 가운데 아래 칸 = 차량
    ];

    const CORNER_BTN_IDS = ['home-weather-btn', 'home-airport-btn', 'home-course-btn', 'home-reward-btn'];

    // 펼침도 기록 한 칸으로 남겨, 휴대폰 뒤로가기가 사이트를 떠나지 않고 메뉴를 접게 한다
    function pushHomeExpand(kind) {
        const state = { section: 'home', inApp: true, homeExpand: kind };
        if (history.state && history.state.homeExpand) history.replaceState(state, '', '/');
        else history.pushState(state, '', '/');
    }

    window.toggleLostExpand = function() {
        if (lostExpanded) {
            if (history.state && history.state.homeExpand === 'lost') history.back(); // popstate가 접는다
            else window.collapseLostGrid();
        } else {
            window.expandLostGrid();
            pushHomeExpand('lost');
        }
    };

    window.expandLostGrid = function() {
        if (lostExpanded) return;
        if (window.collapseHallasanGrid) window.collapseHallasanGrid();
        if (window.collapseWeatherGrid) window.collapseWeatherGrid();
        if (window.collapseReservationGrid) window.collapseReservationGrid();
        if (window.collapseCharterGrid) window.collapseCharterGrid();
        
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
        { origId: 'home-festival-btn',  subId: 'res-sub-cake',      animClass: 'lost-sub-in-left',   outClass: 'lost-sub-out-left' },
        { origId: 'home-lost-btn',      subId: 'res-sub-anniversary',     animClass: 'lost-sub-in-right',  outClass: 'lost-sub-out-right' },
        // 예약신청이 가운데 오른쪽 칸이라 아래 줄 세 칸에 스냅·렌트·기타를 순서대로 둔다
        { origId: 'home-course-btn',    subId: 'res-sub-snap',       animClass: 'lost-sub-in-bottom', outClass: 'lost-sub-out-bottom' },
        { origId: 'home-food-btn',      subId: 'res-sub-camera',    animClass: 'lost-sub-in-bottom', outClass: 'lost-sub-out-bottom' },
        { origId: 'home-reward-btn',    subId: 'res-sub-other',      animClass: 'lost-sub-in-bottom', outClass: 'lost-sub-out-bottom' },
    ];

    window.toggleReservationExpand = function() {
        if (reservationExpanded) {
            if (history.state && history.state.homeExpand === 'res') history.back();
            else window.collapseReservationGrid();
        } else {
            window.expandReservationGrid();
            pushHomeExpand('res');
        }
    };

    // 뒤로/앞으로 가기로 홈 기록에 도착했을 때 그 기록의 펼침 상태로 맞춘다
    window.syncHomeExpand = function(kind) {
        if (kind === 'lost') { if (!lostExpanded) window.expandLostGrid(); }
        else if (kind === 'res') { if (!reservationExpanded) window.expandReservationGrid(); }
        else if (kind === 'charter') { if (!charterExpanded) window.expandCharterGrid(); }
        else if (kind === 'hallasan') { if (window.expandHallasanGrid) window.expandHallasanGrid(); }
        else if (kind === 'weather') { if (window.expandWeatherGrid) window.expandWeatherGrid(); }
        else if (!window.keepLostMenuOpen) {
            window.collapseLostGrid();
            window.collapseReservationGrid();
            window.collapseCharterGrid();
            if (window.collapseHallasanGrid) window.collapseHallasanGrid();
            if (window.collapseWeatherGrid) window.collapseWeatherGrid();
        }
    };

    window.expandReservationGrid = function() {
        if (reservationExpanded) return;
        if (window.collapseHallasanGrid) window.collapseHallasanGrid();
        if (window.collapseWeatherGrid) window.collapseWeatherGrid();
        // 분실물·차량이 열려있으면 먼저 닫기
        if (window.collapseLostGrid) window.collapseLostGrid();
        if (window.collapseCharterGrid) window.collapseCharterGrid();

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

    // ===== 예약신청 버튼 라벨 회전 (무엇을 예약할 수 있는지 미리 보여줌) =====
    // 펼쳐진 동안·탭이 숨겨진 동안은 멈추고, 동작 줄이기 설정이면 돌리지 않는다
    const RES_ROTATE = [
        { key: 'nav.reservation',        icon: 'ph-calendar-check' },
        { key: 'res.rotate.restaurant',  icon: 'ph-fork-knife' },
        { key: 'res.rotate.beauty',      icon: 'ph-scissors' },
        { key: 'res.rotate.cake',        icon: 'ph-cake' },
        { key: 'res.rotate.anniversary', icon: 'ph-heart' },
        { key: 'res.rotate.camera',      icon: 'ph-aperture' },
        { key: 'res.rotate.snap',        icon: 'ph-camera' },
    ];
    (function startReservationRotate() {
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        var idx = 0;
        setInterval(function() {
            if (reservationExpanded || document.hidden) return;
            var btn = document.getElementById('home-reservation-btn');
            if (!btn || btn.offsetParent === null) return;
            var icon  = btn.querySelector('.item-icon i');
            var label = btn.querySelector('.item-label');
            if (!icon || !label) return;

            idx = (idx + 1) % RES_ROTATE.length;
            var next = RES_ROTATE[idx];
            btn.classList.add('res-rotate-out');
            setTimeout(function() {
                if (reservationExpanded) { btn.classList.remove('res-rotate-out'); return; }
                icon.className = 'ph-duotone ' + next.icon + ' color-reservation';
                label.setAttribute('data-i18n', next.key);
                label.textContent = window.t ? window.t(next.key) : label.textContent;
                btn.classList.remove('res-rotate-out');
            }, 200);
        }, 2500);
    })();

    // ===== 차량 홈버튼 → 위 打车·公交 / 왼쪽 拼车 / 오른쪽 包车 토글 =====

    let charterExpanded = false;

    // 차량 버튼(가운데 아래)의 위·왼쪽·오른쪽 칸을 서브 버튼으로 대체. 동승을 먼저 보이도록 왼쪽에 둔다
    const CHARTER_REPLACE_MAP = [
        { origId: 'home-course-btn',      subId: 'charter-sub-pinche', animClass: 'lost-sub-in-left',  outClass: 'lost-sub-out-left' },
        { origId: 'home-lost-btn',        subId: 'charter-sub-fare',   animClass: 'lost-sub-in-top',   outClass: 'lost-sub-out-top' },
        { origId: 'home-reward-btn',      subId: 'charter-sub-baoche', animClass: 'lost-sub-in-right', outClass: 'lost-sub-out-right' }, // 오른쪽 아래 칸 = 맛집
    ];

    // 펼친 동안 숨길 나머지 버튼 (그리드 자리 유지를 위해 visibility 사용)
    const CHARTER_HIDE_IDS = ['home-weather-btn', 'home-hallasan-btn', 'home-airport-btn', 'home-festival-btn', 'home-reservation-btn'];

    window.toggleCharterExpand = function() {
        if (charterExpanded) {
            if (history.state && history.state.homeExpand === 'charter') history.back(); // popstate가 접는다
            else window.collapseCharterGrid();
        } else {
            window.expandCharterGrid();
            pushHomeExpand('charter');
        }
    };

    window.expandCharterGrid = function() {
        if (charterExpanded) return;
        if (window.collapseHallasanGrid) window.collapseHallasanGrid();
        if (window.collapseWeatherGrid) window.collapseWeatherGrid();
        if (window.collapseLostGrid) window.collapseLostGrid();
        if (window.collapseReservationGrid) window.collapseReservationGrid();

        charterExpanded = true;

        CHARTER_REPLACE_MAP.forEach(function(item, i) {
            var orig = document.getElementById(item.origId);
            var sub  = document.getElementById(item.subId);
            if (!orig || !sub) return;

            orig.parentNode.insertBefore(sub, orig);
            orig.style.display = 'none';
            sub.style.display = '';
            sub.style.visibility = 'hidden';

            setTimeout(function() {
                sub.style.visibility = '';
                sub.classList.add(item.animClass);
            }, i * 30);
        });

        CHARTER_HIDE_IDS.forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.style.visibility = 'hidden';
        });

        // 차량 버튼 강조 및 뒤로가기로 변경
        var btn = document.getElementById('home-food-btn');
        if (btn) {
            btn.classList.add('charter-active');
            var icon  = btn.querySelector('.item-icon i');
            var label = btn.querySelector('.item-label');
            if (icon)  icon.className = 'ph-bold ph-arrow-left color-food';
            if (label) label.setAttribute('data-i18n', 'lost.home.back');
        }

        if (window.applyTranslations) window.applyTranslations();
    };

    window.collapseCharterGrid = function() {
        if (!charterExpanded) return;
        charterExpanded = false;

        CHARTER_REPLACE_MAP.forEach(function(item) {
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

        var btn = document.getElementById('home-food-btn');
        if (btn) {
            btn.classList.remove('charter-active');
            var icon  = btn.querySelector('.item-icon i');
            var label = btn.querySelector('.item-label');
            if (icon)  icon.className = 'ph-duotone ph-van color-food';
            if (label) label.setAttribute('data-i18n', 'nav.charter');
        }

        if (window.applyTranslations) window.applyTranslations();

        setTimeout(function() {
            CHARTER_HIDE_IDS.forEach(function(id) {
                var el = document.getElementById(id);
                if (el) el.style.visibility = '';
            });
        }, 250);
    };

    // ===== 버튼 하나 → 주변 칸에 서브 버튼 2개 펼치기 (한라산·날씨 공용, 차량 펼침과 같은 방식) =====
    // cfg: kind(기록 이름), btnId, cls(펼침 강조 클래스), icon/label(원래 아이콘·문구 키), color(아이콘 색 클래스),
    //      replace([{origId, subId, animClass, outClass}]), hide(숨길 칸 id)
    function makeHomeExpand(cfg) {
        let expanded = false;

        function setBtn(on) {
            var btn = document.getElementById(cfg.btnId);
            if (!btn) return;
            btn.classList.toggle(cfg.cls, on);
            var icon  = btn.querySelector('.item-icon i');
            var label = btn.querySelector('.item-label');
            if (icon)  icon.className = on ? 'ph-bold ph-arrow-left ' + cfg.color : 'ph-duotone ' + cfg.icon + ' ' + cfg.color;
            if (label) label.setAttribute('data-i18n', on ? 'lost.home.back' : cfg.label);
        }

        function expand() {
            if (expanded) return;
            if (window.collapseAllHomeExpand) window.collapseAllHomeExpand(cfg.kind);
            expanded = true;
            var grid = document.querySelector('.home-grid');
            if (grid) grid.classList.add('sub-expanded-grid'); // 숨긴 칸의 BETA 배지(맛집은 항상 보이게 강제됨)도 감춘다

            cfg.replace.forEach(function(item, i) {
                var orig = document.getElementById(item.origId);
                var sub  = document.getElementById(item.subId);
                if (!orig || !sub) return;
                orig.parentNode.insertBefore(sub, orig);
                orig.style.display = 'none';
                sub.style.display = '';
                sub.style.visibility = 'hidden';
                setTimeout(function() {
                    sub.style.visibility = '';
                    sub.classList.add(item.animClass);
                }, i * 30);
            });
            cfg.hide.forEach(function(id) {
                var el = document.getElementById(id);
                if (el) el.style.visibility = 'hidden';
            });
            setBtn(true);
            if (window.applyTranslations) window.applyTranslations();
        }

        function collapse() {
            if (!expanded) return;
            expanded = false;
            cfg.replace.forEach(function(item) {
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
            setBtn(false);
            if (window.applyTranslations) window.applyTranslations();
            setTimeout(function() {
                cfg.hide.forEach(function(id) {
                    var el = document.getElementById(id);
                    if (el) el.style.visibility = '';
                });
                var grid = document.querySelector('.home-grid');
                if (grid) grid.classList.remove('sub-expanded-grid');
            }, 250);
        }

        function toggle() {
            if (expanded) {
                if (history.state && history.state.homeExpand === cfg.kind) history.back(); // popstate가 접는다
                else collapse();
            } else {
                expand();
                pushHomeExpand(cfg.kind);
            }
        }

        return { expand: expand, collapse: collapse, toggle: toggle };
    }

    // 한라산(가운데 위) → 왼쪽 한라산 / 오른쪽 오름
    const hallasanExpand = makeHomeExpand({
        kind: 'hallasan', btnId: 'home-hallasan-btn', cls: 'hallasan-active',
        icon: 'ph-mountains', color: 'color-hallasan', label: 'nav.hallasan',
        replace: [
            { origId: 'home-weather-btn', subId: 'hallasan-sub-mountain', animClass: 'lost-sub-in-left',  outClass: 'lost-sub-out-left' },
            { origId: 'home-airport-btn', subId: 'hallasan-sub-oreum',    animClass: 'lost-sub-in-right', outClass: 'lost-sub-out-right' },
        ],
        hide: ['home-festival-btn', 'home-lost-btn', 'home-reservation-btn', 'home-course-btn', 'home-food-btn', 'home-reward-btn'],
    });
    window.toggleHallasanExpand = hallasanExpand.toggle;
    window.expandHallasanGrid = hallasanExpand.expand;
    window.collapseHallasanGrid = hallasanExpand.collapse;

    // 한라산 서브 버튼 동작: 'mountain' = 한라산 탐방로·CCTV, 'oreum' = 오름 목록
    window.goToHallasan = function(tab) {
        window.collapseHallasanGrid();
        if (window.showSection) window.showSection('hallasan');
        if (window.oreumApp) window.oreumApp.switchTab(tab);
    };

    // 날씨(왼쪽 위 모서리) → 첫 줄을 [뒤로][실시간][과거]로. 들어가면 같은 날씨 화면, 탭만 다르게
    const weatherExpand = makeHomeExpand({
        kind: 'weather', btnId: 'home-weather-btn', cls: 'weather-active',
        icon: 'ph-cloud-sun', color: 'color-weather', label: 'nav.weather',
        replace: [
            { origId: 'home-hallasan-btn', subId: 'weather-sub-current', animClass: 'lost-sub-in-right', outClass: 'lost-sub-out-right' },
            { origId: 'home-airport-btn',  subId: 'weather-sub-past',    animClass: 'lost-sub-in-right', outClass: 'lost-sub-out-right' },
        ],
        hide: ['home-festival-btn', 'home-lost-btn', 'home-reservation-btn', 'home-course-btn', 'home-food-btn', 'home-reward-btn'],
    });
    window.toggleWeatherExpand = weatherExpand.toggle;
    window.expandWeatherGrid = weatherExpand.expand;
    window.collapseWeatherGrid = weatherExpand.collapse;

    // 날씨 서브 버튼 동작: 'current' = 실시간, 'past' = 과거 날씨 탭
    window.goToWeather = function(view) {
        window.collapseWeatherGrid();
        if (window.showSection) window.showSection('weather');
        if (window.switchWeatherView) window.switchWeatherView(view);
    };

    // 펼침은 한 번에 하나만: except 외에 열린 것을 모두 접는다
    window.collapseAllHomeExpand = function(except) {
        if (except !== 'lost' && window.collapseLostGrid) window.collapseLostGrid();
        if (except !== 'res' && window.collapseReservationGrid) window.collapseReservationGrid();
        if (except !== 'charter' && window.collapseCharterGrid) window.collapseCharterGrid();
        if (except !== 'hallasan') hallasanExpand.collapse();
        if (except !== 'weather') weatherExpand.collapse();
    };

    // 차량 서브 버튼 동작: 'carpool' = 拼车 달력 (기본 화면), 'fare' = 택시·버스 요금표, 'guide' = 包车 안내
    window.goToCharter = function(focus) {
        window.charterFocus = focus;
        window.collapseCharterGrid();
        if (window.showSection) window.showSection('charter');
    };