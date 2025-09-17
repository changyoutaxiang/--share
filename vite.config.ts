import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  base: '/--share/', // GitHub Pages 部署路径
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false, // 生产环境不生成sourcemap
  },
});
