import { defineConfig } from 'vite';
import injectHTML from 'vite-plugin-html-inject';

export default defineConfig({
  plugins: [
    injectHTML(),
  ],
  build: {
    // 빌드 결과물을 dist/ 폴더에 생성
    outDir: 'dist',
    // 정적 에셋(assets, src)을 올바르게 복사
    assetsDir: 'assets',
  },
  // 개발 서버 설정
  server: {
    port: 3000,
    open: true,
  },
});
