import { defineConfig } from 'vite';
import { resolve } from 'path';
import { execSync } from 'child_process';

// Get git commit hash and build date for version string
function getVersion() {
  try {
    const hash = execSync('git rev-parse --short HEAD').toString().trim();
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return `${date}-${hash}`;
  } catch {
    return 'dev';
  }
}

export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(getVersion()),
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
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
