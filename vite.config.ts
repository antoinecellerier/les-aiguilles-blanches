import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index-vite.html'),
      },
    },
  },
  server: {
    port: 3000,
    open: false,
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
