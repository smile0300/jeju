// ============================================================
// SEO 정적 페이지 빌드 (postbuild.js 다음에 실행)
// - seo/lost-guides/*.json → dist/{lang}/lost/{slug}.html (JS 없이 본문 완성)
// - 언어별 허브 → dist/{lang}/lost/index.html
// - dist/sitemap.xml 자동 생성 (SPA 라우트 + 가이드)
// 기존 SPA 화면에는 영향 없음. 새 가이드는 JSON 파일 하나만 추가하면 됨.
// ============================================================
const fs = require('fs');
const path = require('path');

const SITE = 'https://jeju-live.com';
const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const GUIDE_DIR = path.join(__dirname, 'lost-guides');
const LANGS = ['en', 'zh'];
const HREFLANG = { en: 'en', zh: 'zh-CN' };
const TODAY = new Date().toISOString().slice(0, 10);

const UI = {
    en: {
        home: 'Home', hub: 'Jeju Lost & Found Guides', verified: 'Last verified',
        ctaTitle: 'Find it with Jeju Live',
        ctaSearch: 'Search live lost & found (Jeju)', ctaProxy: 'Request proxy pickup', ctaReport: 'Not listed? Report it to us',
        faq: 'Frequently asked questions', related: 'Related guides', sources: 'Sources', other: '中文',
        hubTitle: 'Jeju Lost and Found Guides — What to Do and Who to Call',
        hubDesc: 'Lost something in Jeju? Step-by-step guides for the airport, taxis, buses, hotels and more, with phone numbers and how to get items back after you leave Korea.',
        hubIntro: 'Pick where you lost it. Each guide lists who holds the item, how to contact them, and what to do if you have already left Korea.',
        footer: 'Real-time Jeju travel info for visitors'
    },
    zh: {
        home: '首页', hub: '济州失物招领指南', verified: '最后核实',
        ctaTitle: '用 Jeju Live 找回失物',
        ctaSearch: '实时查询济州失物', ctaProxy: '申请代领', ctaReport: '没查到？向我们申报遗失',
        faq: '常见问题', related: '相关指南', sources: '信息来源', other: 'English',
        hubTitle: '济州失物招领指南——丢了东西该找谁、怎么办',
        hubDesc: '在济州岛丢了东西？机场、出租车、公交、酒店等场景的找回步骤、联系电话，以及回国后如何把东西寄回来。',
        hubIntro: '选择你丢东西的地方。每篇指南都写明物品由谁保管、怎么联系，以及已经回国时该怎么办。',
        footer: '面向游客的济州实时旅行信息'
    }
};

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const stripTags = s => String(s).replace(/<[^>]+>/g, '');
const guideUrl = (lang, slug) => `${SITE}/${lang}/lost/${slug}`;
const hubUrl = lang => `${SITE}/${lang}/lost/`;

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
.btn-1{background:var(--accent);color:#fff}.btn-1:hover{background:var(--accent-hover)}
.btn-2{background:var(--accent-subtle);color:var(--accent)}
.btn-3{background:var(--fill);color:var(--text-2);margin:0}
details{border-top:1px solid var(--sep);padding:12px 0}
details:first-of-type{border-top:0;padding-top:0}
summary{font-weight:700;cursor:pointer}
details p{margin:8px 0 0;color:var(--text-2)}
.src{font-size:13px;color:var(--text-3)}
.src ul{padding-left:18px;margin:6px 0 0}
.src a{color:var(--text-3)}
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

function renderGuide(guide, lang, guides) {
    const t = UI[lang];
    const c = guide[lang];
    const other = lang === 'en' ? 'zh' : 'en';
    const canonical = guideUrl(lang, guide.slug);

    const summary = `<section class="card summary"><ul>${c.summary.map(s => `<li>${s}</li>`).join('')}</ul></section>`;
    const cta = `<section class="card cta"><h2>${esc(t.ctaTitle)}</h2>
<a class="btn btn-1" href="/lost" data-lang-link>${esc(t.ctaSearch)}</a>
<a class="btn btn-2" href="/lost?action=proxy" data-lang-link>${esc(t.ctaProxy)}</a>
<a class="btn btn-3" href="/lost#report" data-lang-link>${esc(t.ctaReport)}</a></section>`;
    const faq = `<section class="card"><h2>${esc(t.faq)}</h2>${c.faq.map(f => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</section>`;
    const related = guides.filter(g => g.slug !== guide.slug);
    const relatedHtml = related.length ? `<section class="card list"><h2>${esc(t.related)}</h2>${related.map(g => `<a href="/${lang}/lost/${g.slug}"><b>${esc(g[lang].h1)}</b></a>`).join('')}</section>` : '';
    const sources = `<section class="src">${esc(t.sources)}<ul>${guide.sources.map(s => `<li><a href="${esc(s.url)}" rel="nofollow noopener" target="_blank">${esc(s.label)}</a></li>`).join('')}</ul></section>`;

    // CTA는 본문 중간(2번째 섹션 뒤)에 배치
    const sectionHtml = c.sections.map(s => `<section class="card"><h2>${esc(s.h)}</h2>${s.body}</section>`);
    sectionHtml.splice(Math.min(2, sectionHtml.length), 0, cta);

    const body = `<p class="crumb"><a href="/" data-lang-link>${esc(t.home)}</a> › <a href="${hubUrl(lang)}">${esc(t.hub)}</a></p>
<h1>${esc(c.h1)}</h1>
<p class="meta">${esc(t.verified)}: ${esc(guide.verified)}</p>
${summary}
${sectionHtml.join('\n')}
${faq}
${relatedHtml}
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
                    { '@type': 'ListItem', position: 2, name: t.hub, item: hubUrl(lang) },
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
        alternates: Object.fromEntries(LANGS.map(l => [l, guideUrl(l, guide.slug)])),
        otherHref: `/${other}/lost/${guide.slug}`,
        jsonLd, body
    });
}

function renderHub(guides, lang) {
    const t = UI[lang];
    const other = lang === 'en' ? 'zh' : 'en';
    const canonical = hubUrl(lang);
    const list = guides.map(g => `<a href="/${lang}/lost/${g.slug}"><b>${esc(g[lang].h1)}</b><span>${esc(g[lang].desc)}</span></a>`).join('');
    const body = `<p class="crumb"><a href="/" data-lang-link>${esc(t.home)}</a></p>
<h1>${esc(t.hub)}</h1>
<p class="meta">${esc(t.hubIntro)}</p>
<section class="card list">${list}</section>
<section class="card cta"><h2>${esc(t.ctaTitle)}</h2>
<a class="btn btn-1" href="/lost" data-lang-link>${esc(t.ctaSearch)}</a>
<a class="btn btn-2" href="/lost?action=proxy" data-lang-link>${esc(t.ctaProxy)}</a>
<a class="btn btn-3" href="/lost#report" data-lang-link>${esc(t.ctaReport)}</a></section>`;
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: t.hubTitle,
        description: t.hubDesc,
        inLanguage: HREFLANG[lang],
        url: canonical
    };
    return layout({
        lang, title: t.hubTitle, desc: t.hubDesc, canonical,
        alternates: Object.fromEntries(LANGS.map(l => [l, hubUrl(l)])),
        otherHref: `/${other}/lost/`,
        jsonLd, body
    });
}

// SPA 라우트 우선순위 (dist/*.html 중 목록에 없는 라우트는 0.6)
const ROUTE_PRIORITY = { '': ['1.0', 'daily'], lost: ['0.95', 'daily'], weather: ['0.9', 'hourly'], airport: ['0.85', 'hourly'], hallasan: ['0.8', 'daily'], festival: ['0.75', 'weekly'] };
const SITEMAP_EXCLUDE = new Set(['index', '404', 'admin-reply']);

function buildSitemap(guides) {
    const routes = [''].concat(
        fs.readdirSync(DIST).filter(f => f.endsWith('.html')).map(f => f.slice(0, -5)).filter(r => !SITEMAP_EXCLUDE.has(r)).sort()
    );
    const urls = routes.map(r => {
        const [priority, freq] = ROUTE_PRIORITY[r] || ['0.6', 'weekly'];
        return `  <url><loc>${SITE}/${r}</loc><lastmod>${TODAY}</lastmod><changefreq>${freq}</changefreq><priority>${priority}</priority></url>`;
    });
    const altLinks = make => LANGS.map(l => `<xhtml:link rel="alternate" hreflang="${HREFLANG[l]}" href="${make(l)}"/>`).join('') + `<xhtml:link rel="alternate" hreflang="x-default" href="${make('en')}"/>`;
    LANGS.forEach(lang => {
        urls.push(`  <url><loc>${hubUrl(lang)}</loc><lastmod>${TODAY}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority>${altLinks(hubUrl)}</url>`);
        guides.forEach(g => {
            const make = l => guideUrl(l, g.slug);
            urls.push(`  <url><loc>${make(lang)}</loc><lastmod>${TODAY}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority>${altLinks(make)}</url>`);
        });
    });
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`;
}

if (!fs.existsSync(DIST)) {
    console.error('dist/ not found — run vite build first');
    process.exit(1);
}

// 허브 목록 순서는 각 JSON의 order 필드 (없으면 맨 뒤)
const guides = fs.readdirSync(GUIDE_DIR).filter(f => f.endsWith('.json')).map(f => {
    const g = JSON.parse(fs.readFileSync(path.join(GUIDE_DIR, f), 'utf-8'));
    LANGS.forEach(l => { if (!g[l]) throw new Error(`${f}: missing "${l}" content`); });
    return g;
}).sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

LANGS.forEach(lang => {
    const dir = path.join(DIST, lang, 'lost');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), renderHub(guides, lang));
    guides.forEach(g => {
        fs.writeFileSync(path.join(dir, `${g.slug}.html`), renderGuide(g, lang, guides));
        console.log(`Generated /${lang}/lost/${g.slug}`);
    });
});

fs.writeFileSync(path.join(DIST, 'sitemap.xml'), buildSitemap(guides));
console.log(`Generated sitemap.xml (${guides.length} guides × ${LANGS.length} langs)`);
