import { defineConfig } from 'vite';
import injectHTML from 'vite-plugin-html-inject';

export default defineConfig({
  plugins: [
    injectHTML(),
  ],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          'i18n': ['./src/js/i18n.js'],
          'weather': ['./src/js/weather.js'],
          'lost': ['./src/js/lost-found.v1.js']
        }
      }
    }
  },
  // 개발 서버 설정
  server: {
    port: 3000,
    open: true,
    proxy: {
      // API 요청을 wrangler pages dev 서버로 전달 (기본 8788 포트)
      '/api': {
        target: 'http://127.0.0.1:8788',
        changeOrigin: true,
      },
    },
  },
});
