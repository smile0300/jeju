// SPA 경로 정적 HTML 보강 (빌드 마지막 단계)
//
// 배경: Cloudflare Pages는 public/_redirects의 `/* /index.html 200`을
// "무한 루프" 규칙으로 보고 무시한다. 404.html도 있어서 SPA 폴백이 꺼져,
// postbuild.js가 HTML을 만들지 않은 경로(/pickup, /terms 등)는 구글봇에게 404가 된다.
// (사람은 404.html의 JS 리디렉션으로 홈을 거쳐 들어가 문제를 못 느낌)
//
// 처리: src/js/core/main.js의 ROUTE_MAP을 읽어 dist에 HTML이 없는 경로마다
//  - 별칭 경로(값이 다른 섹션을 가리킴, 예: /food → eats) 중 대상 HTML이 있으면 → _redirects에 301
//  - 그 밖의 경로(신청서·약관 등) → index.html 사본 + noindex,follow + 자기 canonical
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const distDir = path.join(root, 'dist');
const SITE = 'https://jeju-live.com';

const mainJs = fs.readFileSync(path.join(root, 'src/js/core/main.js'), 'utf-8');
const mapBody = (mainJs.match(/const ROUTE_MAP = \{([\s\S]*?)\};/) || [])[1];
if (!mapBody) {
    console.error('[spa-fallback] main.js에서 ROUTE_MAP을 찾지 못함');
    process.exit(1);
}
const routeMap = [...mapBody.matchAll(/'(\/[^']*)'\s*:\s*'([^']+)'/g)].map(m => ({ path: m[1], section: m[2] }));

const indexHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf-8');
const hasHtml = slug => fs.existsSync(path.join(distDir, `${slug}.html`));

const redirects = [];
const pages = [];

for (const { path: p, section } of routeMap) {
    if (p === '/') continue;
    const slug = p.slice(1);
    if (hasHtml(slug)) continue; // postbuild.js가 이미 만든 경로

    if (section !== slug && hasHtml(section)) {
        redirects.push(`${p} /${section} 301`);
        continue;
    }

    const html = indexHtml
        .replace(/<meta\s+name="robots"\s+content="[^"]*"/i, '<meta name="robots" content="noindex, follow"')
        .replace(/<link\s+rel="canonical"\s+href="[^"]*"/i, `<link rel="canonical" href="${SITE}${p}"`)
        .replace(/<meta\s+property="og:url"\s+content="[^"]*"/i, `<meta property="og:url" content="${SITE}${p}"`);
    fs.writeFileSync(path.join(distDir, `${slug}.html`), html);
    pages.push(p);
}

// _redirects: 루프로 무시되는 SPA 폴백 규칙은 빼고 별칭 301만 둔다
const redirectsFile = path.join(distDir, '_redirects');
const kept = (fs.existsSync(redirectsFile) ? fs.readFileSync(redirectsFile, 'utf-8') : '')
    .split(/\r?\n/)
    .filter(l => l.trim() && !/^\/\*\s+\/index\.html\s+200/.test(l.trim()));
fs.writeFileSync(redirectsFile, [...kept, ...redirects].join('\n') + '\n');

console.log(`[spa-fallback] noindex 사본 ${pages.length}개: ${pages.join(', ') || '-'}`);
console.log(`[spa-fallback] 301 별칭 ${redirects.length}개: ${redirects.join(' | ') || '-'}`);
