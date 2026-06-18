const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
const indexFile = path.join(distDir, 'index.html');

if (!fs.existsSync(indexFile)) {
    console.error('index.html not found in dist/');
    process.exit(1);
}

const routes = [
    'weather',
    'lost-found',
    'hallasan',
    'airport',
    'festival',
    'reward',
    'cctv'
];

routes.forEach(route => {
    const routeDir = path.join(distDir, route);
    if (!fs.existsSync(routeDir)) {
        fs.mkdirSync(routeDir, { recursive: true });
    }
    fs.copyFileSync(indexFile, path.join(routeDir, 'index.html'));
    console.log(`Copied index.html to ${route}/index.html`);
});

console.log('Post-build SPA pre-rendering complete.');
