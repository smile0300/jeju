// ============================================================
// SEO 정적 페이지 빌드 (postbuild.js 다음에 실행)
// - seo/{category}-guides/*.json → dist/{lang}/{category}/{slug}.html (JS 없이 본문 완성)
// - 카테고리·언어별 허브 → dist/{lang}/{category}/index.html
// - dist/sitemap.xml 자동 생성 (SPA 라우트 + 가이드)
// 기존 SPA 화면에는 영향 없음. 새 가이드는 JSON 파일 하나만 추가하면 됨.
// 새 카테고리는 CATEGORIES에 항목(허브 문구·CTA) 추가 + seo/{key}-guides/ 폴더.
// ============================================================
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const SITE = 'https://jeju-live.com';
const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const LANGS = ['en', 'zh'];
const HREFLANG = { en: 'en', zh: 'zh-CN' };
const TODAY = new Date().toISOString().slice(0, 10);

const UI = {
    en: {
        home: 'Home', verified: 'Last verified',
        faq: 'Frequently asked questions', related: 'Related guides', sources: 'Sources', other: '中文',
        casesTitle: 'Real cases handled by Jeju Live',
        casesLead: (n, since) => `Jeju Live has handled ${n} case${n > 1 ? 's' : ''} like this since ${since}. Most recent:`,
        caseLine: c => `${c.item.en.charAt(0).toUpperCase() + c.item.en.slice(1)} — collected at ${c.place.en}, ${c.dest ? `sent to ${c.dest.en}` : 'handed over in Jeju'}`,
        hubCases: (n, since) => `Since ${since}, Jeju Live has recovered ${n} items for travelers — from hotels, Jeju Airport, taxis, police stations and more.`,
        reviewsTitle: 'What travelers say',
        reviewsLead: 'From public posts and comments on Xiaohongshu (RedNote), translated from Chinese. Tap a thumbnail to see the original screenshot (personal details hidden).',
        shotAlt: 'Original Xiaohongshu screenshot',
        thanksTitle: 'Thank-you messages',
        thanksLead: n => `Messages travelers sent us on WeChat and Xiaohongshu after getting their items back (${n} screenshots). Names, payments and addresses are hidden. Tap to enlarge.`,
        thanksAlt: 'Thank-you message screenshot',
        month: m => new Date(m + '-01T00:00:00Z').toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }),
        moreGuides: 'More Jeju guides',
        footer: 'Real-time Jeju travel info for visitors'
    },
    zh: {
        home: '首页', verified: '最后核实',
        faq: '常见问题', related: '相关指南', sources: '信息来源', other: 'English',
        casesTitle: 'Jeju Live 真实处理案例',
        casesLead: (n, since) => `自${since}起，Jeju Live 已处理此类案例 ${n} 件。最近的案例：`,
        caseLine: c => `${ITEM_ZH_FIX[c.item.zh] || c.item.zh}——${c.place.zh}取回，${c.dest ? `寄往${c.dest.zh}` : '在济州交付'}`,
        hubCases: (n, since) => `自${since}起，Jeju Live 已为游客找回 ${n} 件物品——来自酒店、济州机场、出租车、警察局等。`,
        reviewsTitle: '游客评价',
        reviewsLead: '摘自小红书公开笔记和评论。点击缩略图可查看原截图（个人信息已打码）。',
        shotAlt: '小红书原截图',
        thanksTitle: '客户感谢留言',
        thanksLead: n => `游客找回物品后通过微信、小红书私信发来的感谢（共 ${n} 张截图）。姓名、转账金额和地址已打码，点击可放大。`,
        thanksAlt: '感谢留言截图',
        month: m => `${m.slice(0, 4)}年${Number(m.slice(5, 7))}月`,
        moreGuides: '更多济州指南',
        footer: '面向游客的济州实时旅行信息'
    }
};

// 카테고리: 허브 문구와 CTA 버튼(SPA 화면으로 연결). showcase: 허브에 처리 사례·후기·감사 캡처 표시
const CATEGORIES = [
    {
        key: 'lost', showcase: true,
        en: {
            hub: 'Jeju Lost & Found Guides',
            hubTitle: 'Jeju Lost and Found Guides — What to Do and Who to Call',
            hubDesc: 'Lost something in Jeju? Step-by-step guides for the airport, taxis, buses, hotels and more, with phone numbers and how to get items back after you leave Korea.',
            hubIntro: 'Pick where you lost it. Each guide lists who holds the item, how to contact them, and what to do if you have already left Korea.',
            ctaTitle: 'Find it with Jeju Live',
            ctas: [['/lost', 'Search live lost & found (Jeju)'], ['/lost?action=proxy', 'Request proxy pickup'], ['/lost#report', 'Not listed? Report it to us']]
        },
        zh: {
            hub: '济州失物招领指南',
            hubTitle: '济州失物招领指南——丢了东西该找谁、怎么办',
            hubDesc: '在济州岛丢了东西？机场、出租车、公交、酒店等场景的找回步骤、联系电话，以及回国后如何把东西寄回来。',
            hubIntro: '选择你丢东西的地方。每篇指南都写明物品由谁保管、怎么联系，以及已经回国时该怎么办。',
            ctaTitle: '用 Jeju Live 找回失物',
            ctas: [['/lost', '实时查询济州失物'], ['/lost?action=proxy', '申请代领'], ['/lost#report', '没查到？向我们申报遗失']]
        }
    },
    {
        key: 'charter',
        en: {
            hub: 'Jeju Private Car Guides',
            hubTitle: 'Jeju Private Car Hire Guides — Prices and Legal Checks',
            hubDesc: 'Hiring a car with a driver in Jeju: 2026 price ranges by vehicle size, and how to tell a licensed car from an illegal one.',
            hubIntro: 'What a day with a driver costs in Jeju, and how to make sure the car you book is legal and insured.',
            ctaTitle: 'Plan your ride on Jeju Live',
            ctas: [['/charter', 'Compare reference prices'], ['/charter?view=pinche', 'Find travelers to share a car']]
        },
        zh: {
            hub: '济州包车指南',
            hubTitle: '济州包车指南——价格行情与合法车辆分辨',
            hubDesc: '在济州岛包车：2026年各车型价格行情，以及如何分辨合法营运车辆和黑车。',
            hubIntro: '济州包车一天大概多少钱，以及怎样确认你订的车合法、有保险。',
            ctaTitle: '在 Jeju Live 安排用车',
            ctas: [['/charter', '查看参考价格与商家对比'], ['/charter?view=pinche', '找人拼车']]
        }
    }
];

// 실제 처리 사례 스냅샷 (seo/update-cases.js로 갱신)
const CASES = JSON.parse(fs.readFileSync(path.join(__dirname, 'cases.json'), 'utf-8'));
const ITEM_ZH_FIX = { Tumblr: '保温杯' };
// 고객 후기 (샤오훙수 공개 글·댓글, 닉네임은 가린 형태로 저장)
const REVIEWS_DATA = JSON.parse(fs.readFileSync(path.join(__dirname, 'reviews.json'), 'utf-8'));
const REVIEWS = REVIEWS_DATA.reviews;

function renderReviews(key, lang) {
    const t = UI[lang];
    const list = REVIEWS.filter(r => r.guides.includes(key));
    if (!list.length) return '';
    const items = list.map(r => {
        const cite = [r.nick, r.region && r.region[lang], t.month(r.month)].filter(Boolean).map(esc).join(' · ');
        const shot = r.img ? `<a class="shot" href="/img/reviews/${esc(r.img)}" target="_blank" rel="noopener"><img src="/img/reviews/${esc(r.img)}" alt="${esc(t.shotAlt)}" width="72" height="156" loading="lazy"></a>` : '';
        return `<blockquote class="review">${shot}<p>${esc(r[lang]).replace(/\n/g, '<br>')}</p><cite>${cite}</cite></blockquote>`;
    }).join('');
    return `<section class="card"><h2>${esc(t.reviewsTitle)}</h2><p class="lead">${esc(t.reviewsLead)}</p>${items}</section>`;
}

// 허브 전용: 위챗·DM 감사 메시지 캡처 갤러리 (이미지에 개인정보 모자이크 처리됨)
function renderThanks(lang) {
    const t = UI[lang];
    const list = REVIEWS_DATA.thanks || [];
    if (!list.length) return '';
    const shots = list.map(f => `<a href="/img/reviews/${esc(f)}" target="_blank" rel="noopener"><img src="/img/reviews/${esc(f)}" alt="${esc(t.thanksAlt)}" width="96" height="208" loading="lazy"></a>`).join('');
    return `<section class="card"><h2>${esc(t.thanksTitle)}</h2><p class="lead">${esc(t.thanksLead(list.length))}</p><div class="gallery">${shots}</div></section>`;
}

// 차량 참고 요금: SPA와 같은 데이터(src/data/charter.js)를 표로 렌더링
// 가이드 JSON 섹션에 "render": "charterPrices" | "charterCompare" 를 넣으면 body 뒤에 표가 붙는다
let CHARTER = null;
const pickL = (o, lang) => (o && typeof o === 'object') ? (o[lang] ?? o.en) : o;
const RENDERERS = {
    charterPrices(lang) {
        const rows = CHARTER.CHARTER_PRICES.map(p => `<tr><th scope="row">${esc(pickL(p.vehicle, lang))}<small>${esc(pickL(p.detail, lang))}</small></th><td>${esc(p.price)}<small>${esc(pickL(p.unit, lang))}</small></td></tr>`).join('');
        return `<table class="tbl"><tbody>${rows}</tbody></table>`;
    },
    charterCompare(lang) {
        const head = lang === 'zh' ? ['商家', '5座', '7座', '9座', '11座'] : ['Operator', '5-seat', '7-seat', '9-seat', '11-seat'];
        const rows = CHARTER.CHARTER_COMPARE.map(r => `<tr><th scope="row">${esc(r.name)}<small>${esc(pickL(r.note, lang))}</small></th>${r.flat
            ? `<td colspan="4">${esc(pickL(r.flat, lang))}</td>`
            : r.prices.map(v => `<td>${esc(v).replace('~', '~<wbr>')}</td>`).join('')}</tr>`).join('');
        return `<table class="tbl tbl-cmp"><thead><tr>${head.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`;
    }
};

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const stripTags = s => String(s).replace(/<[^>]+>/g, '');
const guideUrl = (cat, lang, slug) => `${SITE}/${lang}/${cat.key}/${slug}`;
const hubUrl = (cat, lang) => `${SITE}/${lang}/${cat.key}/`;

const ctaHtml = (cat, lang) => `<section class="card cta"><h2>${esc(cat[lang].ctaTitle)}</h2>
${cat[lang].ctas.map(([href, label], i) => `<a class="btn btn-${Math.min(i + 1, 3)}" href="${href}" data-lang-link>${esc(label)}</a>`).join('\n')}</section>`;

// 다른 카테고리 허브로 가는 링크 (가이드끼리 서로 이어지도록)
function otherHubsHtml(cat, lang) {
    const others = CATEGORIES.filter(c => c !== cat);
    if (!others.length) return '';
    return `<section class="card list"><h2>${esc(UI[lang].moreGuides)}</h2>${others.map(c => `<a href="/${lang}/${c.key}/"><b>${esc(c[lang].hub)}</b><span>${esc(c[lang].hubDesc)}</span></a>`).join('')}</section>`;
}

const CSS = `
:root{--accent:#3182F6;--accent-hover:#1B6EE4;--accent-subtle:rgba(49,130,246,.10);--bg:#F8F9FA;--card:#FFF;--fill:#F2F4F6;--text:#191F28;--text-2:#4E5968;--text-3:#8B95A1;--sep:#E5E8EB}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font-family:"Pretendard",-apple-system,BlinkMacSystemFont,"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans KR",sans-serif;line-height:1.65;font-size:16px;-webkit-text-size-adjust:100%}
a{color:var(--accent)}
.top{background:var(--card);border-bottom:1px solid var(--sep)}
.top-in,.wrap{max-width:720px;margin:0 auto;padding:0 16px}
.top-in{display:flex;align-items:center;justify-content:space-between;height:56px}
.brand{font-weight:800;color:var(--text);text-decoration:none;font-size:18px}
.lang{font-size:14px;color:var(--text-2);text-decoration:none;padding:6px 12px;background:var(--fill);border-radius:999px}
.crumb{font-size:13px;color:var(--text-3);margin:16px 0 0}
.crumb a{color:var(--text-3);text-decoration:none}
h1{font-size:26px;line-height:1.3;margin:8px 0 4px;overflow-wrap:anywhere}
.meta{font-size:13px;color:var(--text-3);margin:0 0 20px}
.card{background:var(--card);border-radius:16px;padding:20px;margin:0 0 16px}
.summary{border:2px solid var(--accent-subtle)}
.summary ul{margin:0;padding-left:20px}
.summary li{margin:6px 0}
h2{font-size:20px;line-height:1.35;margin:0 0 10px;overflow-wrap:anywhere}
.card p{margin:0 0 10px}.card p:last-child{margin-bottom:0}
.card ul,.card ol{padding-left:22px;margin:0 0 10px}
.card li{margin:4px 0}
.cta h2{margin-bottom:14px}
.btn{display:block;text-align:center;text-decoration:none;font-weight:700;padding:14px 16px;border-radius:12px;margin:0 0 10px;font-size:16px}
.btn:last-child{margin-bottom:0}
.btn-1{background:var(--accent);color:#fff}.btn-1:hover{background:var(--accent-hover)}
.btn-2{background:var(--accent-subtle);color:var(--accent)}
.btn-3{background:var(--fill);color:var(--text-2)}
.tbl{width:100%;border-collapse:collapse;font-size:14px;margin:0 0 10px}
.tbl th,.tbl td{padding:9px 4px;border-top:1px solid var(--sep);text-align:left;vertical-align:top}
.tbl td{text-align:right;font-weight:700;white-space:nowrap}
.tbl small{display:block;font-weight:400;color:var(--text-3);font-size:12px}
.tbl-cmp{table-layout:fixed}
.tbl-cmp thead th{font-size:12px;color:var(--text-3);text-align:right;border-top:0}
.tbl-cmp thead th:first-child{text-align:left;width:34%}
.tbl-cmp th[scope=row]{overflow-wrap:anywhere}
.tbl-cmp td{white-space:normal;font-size:13px}
.tbl-cmp td[colspan]{text-align:center}
details{border-top:1px solid var(--sep);padding:12px 0}
details:first-of-type{border-top:0;padding-top:0}
summary{font-weight:700;cursor:pointer}
details p{margin:8px 0 0;color:var(--text-2)}
.src{font-size:13px;color:var(--text-3)}
.src ul{padding-left:18px;margin:6px 0 0}
.src a{color:var(--text-3)}
.lead{font-size:14px;color:var(--text-3)}
.review{margin:0;padding:14px 0;border-top:1px solid var(--sep);overflow:hidden}
.review p{margin:0 0 6px}
.review cite{display:block;font-size:13px;color:var(--text-3);font-style:normal}
.shot{float:right;margin:0 0 8px 12px}
.shot img{display:block;width:72px;height:auto;border-radius:8px;border:1px solid var(--sep)}
.gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:8px}
.gallery img{display:block;width:100%;height:auto;aspect-ratio:9/19.5;object-fit:cover;object-position:top;border-radius:8px;border:1px solid var(--sep)}
.list a{display:block;text-decoration:none;color:var(--text);padding:14px 0;border-top:1px solid var(--sep)}
.list a:first-child,.list h2+a{border-top:0;padding-top:0}
.list b{display:block}.list span{font-size:14px;color:var(--text-3)}
footer{text-align:center;font-size:13px;color:var(--text-3);padding:24px 16px 40px}
footer a{color:var(--text-3)}
`;

// CTA 클릭 시 SPA 언어를 가이드 언어에 맞춤 (SPA 기본값은 zh)
const langScript = lang => `<script>document.addEventListener('click',function(e){var a=e.target.closest('[data-lang-link]');if(a){try{localStorage.setItem('jeju_lang','${lang}')}catch(_){}}});</script>`;

const gaScript = `<script async src="https://www.googletagmanager.com/gtag/js?id=G-Z9BZ11GZQ1"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-Z9BZ11GZQ1');gtag('set','allow_ad_personalization_signals',false);gtag('set','allow_google_signals',false);</script>`;

function layout({ lang, title, desc, canonical, alternates, otherHref, jsonLd, body }) {
    const t = UI[lang];
    const alt = Object.entries(alternates).map(([l, href]) => `<link rel="alternate" hreflang="${HREFLANG[l]}" href="${href}">`).join('\n');
    return `<!doctype html>
<html lang="${HREFLANG[lang]}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${canonical}">
${alt}
<link rel="alternate" hreflang="x-default" href="${alternates.en}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Jeju Live">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${SITE}/img/icon-512.png">
<meta property="og:locale" content="${lang === 'zh' ? 'zh_CN' : 'en_US'}">
<meta name="theme-color" content="#ffffff">
<link rel="icon" href="/img/icon-192.png">
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
${gaScript}
<style>${CSS}</style>
</head>
<body>
<header class="top"><div class="top-in"><a class="brand" href="/" data-lang-link>Jeju Live</a><a class="lang" href="${otherHref}" hreflang="${HREFLANG[lang === 'en' ? 'zh' : 'en']}">${t.other}</a></div></header>
<main class="wrap">
${body}
</main>
<footer><a href="/" data-lang-link>jeju-live.com</a> · ${esc(t.footer)}</footer>
${langScript(lang)}
</body>
</html>
`;
}

function renderGuide(cat, guide, lang, guides) {
    const t = UI[lang];
    const ct = cat[lang];
    const c = guide[lang];
    const other = lang === 'en' ? 'zh' : 'en';
    const canonical = guideUrl(cat, lang, guide.slug);

    const summary = `<section class="card summary"><ul>${c.summary.map(s => `<li>${s}</li>`).join('')}</ul></section>`;
    const cta = ctaHtml(cat, lang);
    const faq = `<section class="card"><h2>${esc(t.faq)}</h2>${c.faq.map(f => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</section>`;
    // 실제 사례: 해당 주제 건수 + 최근 6건 (cases.json은 최신순 정렬)
    const myCases = CASES.cases.filter(cs => cs.guides.includes(guide.slug));
    const casesHtml = myCases.length ? `<section class="card"><h2>${esc(t.casesTitle)}</h2><p>${esc(t.casesLead(myCases.length, t.month(myCases[myCases.length - 1].month)))}</p><ul>${myCases.slice(0, 6).map(cs => `<li><b>${esc(t.month(cs.month))}</b> · ${esc(t.caseLine(cs))}</li>`).join('')}</ul></section>` : '';

    const related = guides.filter(g => g.slug !== guide.slug);
    const relatedHtml = related.length ? `<section class="card list"><h2>${esc(t.related)}</h2>${related.map(g => `<a href="/${lang}/${cat.key}/${g.slug}"><b>${esc(g[lang].h1)}</b></a>`).join('')}</section>` : '';
    const sources = `<section class="src">${esc(t.sources)}<ul>${guide.sources.map(s => `<li><a href="${esc(s.url)}" rel="nofollow noopener" target="_blank">${esc(s.label)}</a></li>`).join('')}</ul></section>`;

    // CTA는 본문 중간(2번째 섹션 뒤)에 배치
    const sectionHtml = c.sections.map(s => `<section class="card"><h2>${esc(s.h)}</h2>${s.body || ''}${s.render ? RENDERERS[s.render](lang) : ''}${s.after || ''}</section>`);
    sectionHtml.splice(Math.min(2, sectionHtml.length), 0, cta);

    const body = `<p class="crumb"><a href="/" data-lang-link>${esc(t.home)}</a> › <a href="${hubUrl(cat, lang)}">${esc(ct.hub)}</a></p>
<h1>${esc(c.h1)}</h1>
<p class="meta">${esc(t.verified)}: ${esc(guide.verified)}</p>
${summary}
${sectionHtml.join('\n')}
${casesHtml}
${renderReviews(guide.slug, lang)}
${faq}
${relatedHtml}
${otherHubsHtml(cat, lang)}
${sources}`;

    const jsonLd = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'Article',
                headline: c.h1,
                description: c.desc,
                inLanguage: HREFLANG[lang],
                dateModified: TODAY,
                mainEntityOfPage: canonical,
                publisher: { '@type': 'Organization', name: 'Jeju Live', url: SITE + '/' }
            },
            {
                '@type': 'BreadcrumbList',
                itemListElement: [
                    { '@type': 'ListItem', position: 1, name: t.home, item: SITE + '/' },
                    { '@type': 'ListItem', position: 2, name: ct.hub, item: hubUrl(cat, lang) },
                    { '@type': 'ListItem', position: 3, name: c.h1, item: canonical }
                ]
            },
            {
                '@type': 'FAQPage',
                mainEntity: c.faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: stripTags(f.a) } }))
            }
        ]
    };

    return layout({
        lang, title: c.title, desc: c.desc, canonical,
        alternates: Object.fromEntries(LANGS.map(l => [l, guideUrl(cat, l, guide.slug)])),
        otherHref: `/${other}/${cat.key}/${guide.slug}`,
        jsonLd, body
    });
}

function renderHub(cat, guides, lang) {
    const t = UI[lang];
    const ct = cat[lang];
    const other = lang === 'en' ? 'zh' : 'en';
    const canonical = hubUrl(cat, lang);
    const list = guides.map(g => `<a href="/${lang}/${cat.key}/${g.slug}"><b>${esc(g[lang].h1)}</b><span>${esc(g[lang].desc)}</span></a>`).join('');
    const showcase = cat.showcase ? `${renderReviews('hub', lang)}\n${renderThanks(lang)}` : '';
    const casesSummary = cat.showcase && CASES.cases.length
        ? `<section class="card summary"><p>${esc(t.hubCases(CASES.cases.length, t.month(CASES.cases[CASES.cases.length - 1].month)))}</p></section>` : '';
    const body = `<p class="crumb"><a href="/" data-lang-link>${esc(t.home)}</a></p>
<h1>${esc(ct.hub)}</h1>
<p class="meta">${esc(ct.hubIntro)}</p>
${casesSummary}
<section class="card list">${list}</section>
${showcase}
${ctaHtml(cat, lang)}
${otherHubsHtml(cat, lang)}`;
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: ct.hubTitle,
        description: ct.hubDesc,
        inLanguage: HREFLANG[lang],
        url: canonical
    };
    return layout({
        lang, title: ct.hubTitle, desc: ct.hubDesc, canonical,
        alternates: Object.fromEntries(LANGS.map(l => [l, hubUrl(cat, l)])),
        otherHref: `/${other}/${cat.key}/`,
        jsonLd, body
    });
}

// SPA 라우트 우선순위 (dist/*.html 중 목록에 없는 라우트는 0.6)
const ROUTE_PRIORITY = { '': ['1.0', 'daily'], lost: ['0.95', 'daily'], weather: ['0.9', 'hourly'], airport: ['0.85', 'hourly'], hallasan: ['0.8', 'daily'], festival: ['0.75', 'weekly'] };
const SITEMAP_EXCLUDE = new Set(['index', '404', 'admin-reply']);

function buildSitemap(groups) {
    const routes = [''].concat(
        fs.readdirSync(DIST).filter(f => f.endsWith('.html')).map(f => f.slice(0, -5)).filter(r => !SITEMAP_EXCLUDE.has(r)).sort()
    );
    const urls = routes.map(r => {
        const [priority, freq] = ROUTE_PRIORITY[r] || ['0.6', 'weekly'];
        return `  <url><loc>${SITE}/${r}</loc><lastmod>${TODAY}</lastmod><changefreq>${freq}</changefreq><priority>${priority}</priority></url>`;
    });
    const altLinks = make => LANGS.map(l => `<xhtml:link rel="alternate" hreflang="${HREFLANG[l]}" href="${make(l)}"/>`).join('') + `<xhtml:link rel="alternate" hreflang="x-default" href="${make('en')}"/>`;
    groups.forEach(({ cat, guides }) => LANGS.forEach(lang => {
        const hub = l => hubUrl(cat, l);
        urls.push(`  <url><loc>${hub(lang)}</loc><lastmod>${TODAY}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority>${altLinks(hub)}</url>`);
        guides.forEach(g => {
            const make = l => guideUrl(cat, l, g.slug);
            urls.push(`  <url><loc>${make(lang)}</loc><lastmod>${TODAY}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority>${altLinks(make)}</url>`);
        });
    }));
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`;
}

async function main() {
    if (!fs.existsSync(DIST)) {
        console.error('dist/ not found — run vite build first');
        process.exit(1);
    }
    CHARTER = await import(pathToFileURL(path.join(ROOT, 'src', 'data', 'charter.js')).href);

    // 허브 목록 순서는 각 JSON의 order 필드 (없으면 맨 뒤)
    const groups = CATEGORIES.map(cat => {
        const dir = path.join(__dirname, `${cat.key}-guides`);
        const guides = fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => {
            const g = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'));
            LANGS.forEach(l => { if (!g[l]) throw new Error(`${cat.key}-guides/${f}: missing "${l}" content`); });
            return g;
        }).sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
        return { cat, guides };
    });

    groups.forEach(({ cat, guides }) => LANGS.forEach(lang => {
        const out = path.join(DIST, lang, cat.key);
        fs.mkdirSync(out, { recursive: true });
        fs.writeFileSync(path.join(out, 'index.html'), renderHub(cat, guides, lang));
        guides.forEach(g => {
            fs.writeFileSync(path.join(out, `${g.slug}.html`), renderGuide(cat, g, lang, guides));
            console.log(`Generated /${lang}/${cat.key}/${g.slug}`);
        });
    }));

    fs.writeFileSync(path.join(DIST, 'sitemap.xml'), buildSitemap(groups));
    console.log(`Generated sitemap.xml (${groups.map(g => `${g.cat.key} ${g.guides.length}`).join(', ')} guides × ${LANGS.length} langs)`);
}

main().catch(e => { console.error(e); process.exit(1); });
