import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages 部署兼容：相对路径 base
  base: './',
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    port: 5173,
    open: false,
  },
});
