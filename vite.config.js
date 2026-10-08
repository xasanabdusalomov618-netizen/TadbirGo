import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'client',
  publicDir: '../public',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      '/api': { target: 'http://127.0.0.1:4000', changeOrigin: false },
      '/media': { target: 'http://127.0.0.1:4000', changeOrigin: false },
    },
    hmr: { clientPort: 443, protocol: 'wss' },
  },
  build: {
    outDir: '../client/dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1200,
  },
});
