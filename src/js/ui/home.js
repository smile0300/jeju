// 언어 드롭다운 외부 클릭 시 닫기
    document.addEventListener('click', function(event) {
        const langSelector = document.querySelector('.lang-selector');
        if (langSelector && langSelector.classList.contains('show')) {
            // 클릭된 요소가 lang-selector 내부가 아니면 닫기
            if (!langSelector.contains(event.target)) {
                langSelector.classList.remove('show');
            }
        }
    });

    // CCTV 신청 모달 열기/닫기
    window.openCctvApplyModal = function() {
        const modal = document.getElementById('cctv-apply-modal');
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            if (window.pushModalState) window.pushModalState();
        }
    };

    window.closeCctvApplyModal = function(fromPopState = false) {
        const modal = document.getElementById('cctv-apply-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
            const statusEl = document.getElementById('cctv-apply-status');
            if (statusEl) statusEl.style.display = 'none';
            if (!fromPopState && window.location.hash === '#modal') window.history.back();
        }
    };

    window.calculateCctvPrice = function() {
        const startEl = document.getElementById('cctv-apply-start');
        const endEl = document.getElementById('cctv-apply-end');
        const previewEl = document.getElementById('cctv-price-preview');
        
        if (startEl.value && endEl.value) {
            const start = new Date(startEl.value);
            const end = new Date(endEl.value);
            const diffTime = end - start;
            
            if (diffTime >= 0) {
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Inclusive of start day
                const totalPrice = diffDays * 10;
                const daysText = window.t ? window.t('cctv.apply.total_days_format').replace('{n}', diffDays) : `共 ${diffDays} 天`;
                const currency = window.t ? window.t('cctv.apply.currency') : '元';
                previewEl.innerHTML = `<span>${daysText}</span> · <strong class="total-price">${totalPrice} ${currency}</strong>`;
                previewEl.style.display = 'flex';
            } else {
                previewEl.style.display = 'none';
            }
        } else {
            previewEl.style.display = 'none';
        }
    };

    // CCTV 신청 제출
    window.submitCctvApply = async function() {
        const wechatEl = document.getElementById('cctv-apply-wechat');
        const statusEl = document.getElementById('cctv-apply-status');
        const submitBtn = document.getElementById('cctv-apply-submit-btn');

        const startEl = document.getElementById('cctv-apply-start');
        const endEl = document.getElementById('cctv-apply-end');

        const wechatId = wechatEl ? wechatEl.value.trim() : '';
        const startDate = startEl ? startEl.value : '';
        const endDate = endEl ? endEl.value : '';

        if (!wechatId || !startDate || !endDate) {
            if (statusEl) {
                statusEl.textContent = window.t ? window.t('lost.report.fill_err') : '请填写完整的信息';
                statusEl.className = 'form-status error';
                statusEl.style.display = 'block';
            }
            return;
        }

        try {
            if (submitBtn) submitBtn.disabled = true;
            if (statusEl) {
                statusEl.textContent = window.t ? window.t('alert.submitting') : '提交中...';
                statusEl.className = 'form-status';
                statusEl.style.display = 'block';
            }

            // Google Apps Script를 통해 신청 정보 저장
            const CONFIG = window.APP_CONFIG || { PROXY_URL: '' };
            const res = await fetch(`${CONFIG.PROXY_URL || ''}/api/feature-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'cctv_apply',
                    wechat: wechatId,
                    startDate: startDate,
                    endDate: endDate,
                    month: '2026-08',
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent
                })
            });

            if (res.ok) {
                if (statusEl) {
                    statusEl.textContent = window.t ? window.t('cctv.apply.success') : '✅ 预约成功！将通过微信联系您。';
                    statusEl.className = 'form-status success';
                    statusEl.style.display = 'block';
                }
                if (wechatEl) wechatEl.value = '';
                setTimeout(() => { window.closeCctvApplyModal(); }, 2500);
            } else {
                throw new Error('Server Error');
            }
        } catch(e) {
            if (statusEl) {
                statusEl.textContent = window.t ? window.t('cctv.apply.error') : '❌ 提交失败，请稍后再试。';
                statusEl.className = 'form-status error';
                statusEl.style.display = 'block';
            }
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    };

    // ===== 분실물 홈버튼 → 십자가 배열 토글 =====

    let lostExpanded = false;

    // 서브 버튼 id → 원래 버튼 id 매핑 (서브 버튼을 원래 버튼 앞에 삽입)
    const LOST_REPLACE_MAP = [
        { origId: 'home-hallasan-btn', subId: 'lost-sub-search',   animClass: 'lost-sub-in-top',    outClass: 'lost-sub-out-top' },
        { origId: 'home-festival-btn', subId: 'lost-sub-status',   animClass: 'lost-sub-in-left',   outClass: 'lost-sub-out-left' },
        { origId: 'home-reward-btn',   subId: 'lost-sub-register', animClass: 'lost-sub-in-right',  outClass: 'lost-sub-out-right' },
        { origId: 'home-course-btn',   subId: 'lost-sub-proxy',    animClass: 'lost-sub-in-bottom', outClass: 'lost-sub-out-bottom' },
    ];

    const CORNER_BTN_IDS = ['home-weather-btn', 'home-airport-btn', 'home-food-btn'];

    window.toggleLostExpand = function() {
        lostExpanded ? window.collapseLostGrid() : window.expandLostGrid();
    };

    window.expandLostGrid = function() {
        lostExpanded = true;
        document.querySelector('.home-grid').classList.add('lost-expanded-grid');

        LOST_REPLACE_MAP.forEach(function(item, i) {
            var orig = document.getElementById(item.origId);
            var sub  = document.getElementById(item.subId);
            if (!orig || !sub) return;

            // 서브 버튼을 원래 버튼 바로 앞에 이동 (같은 그리드 위치)
            orig.parentNode.insertBefore(sub, orig);
            orig.style.display = 'none';

            // 딜레이 등장 대신 거의 동시에 가운데에서 퍼져나가게 처리
            setTimeout(function() {
                sub.style.display = '';
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

            setTimeout(function() {
                sub.style.display = '';
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
            if (icon)  icon.className = 'ph-duotone ph-calendar-check color-reservation';
            if (label) label.setAttribute('data-i18n', 'nav.reservation');
        }

        // 번역 재적용
        if (window.applyTranslations) window.applyTranslations();
    };

    // 각 예약 서브버튼 클릭 → 유형 설정 후 예약 폼으로 이동
    window.goToReservation = function(type) {
        window.currentReservationType = type;
        window.collapseReservationGrid();
        if (window.showSection) window.showSection('reservation');
    };