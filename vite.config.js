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
          'i18n': ['./src/js/core/i18n.js'],
          'weather': ['./src/js/features/weather.js'],
          'lost': ['./src/js/features/lost-found.v1.js']
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
      // 공공데이터 키 없이 화면만 볼 때: API_TARGET=https://jeju-live.com npm run dev
      // (주의: 이 경우 양식 제출도 운영 시트에 그대로 기록된다)
      '/api': {
        target: process.env.API_TARGET || 'http://127.0.0.1:8788',
        changeOrigin: true,
      },
    },
  },
});
