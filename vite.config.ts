import { defineConfig } from 'vite';
import { resolve } from 'path';
import { execSync } from 'child_process';
import { visualizer } from 'rollup-plugin-visualizer';

// Get git commit hash and build date for version string
function getVersion() {
  try {
    const hash = execSync('git rev-parse --short HEAD').toString().trim();
    const dirty = execSync('git status --porcelain').toString().trim();
    if (dirty) {
      // In dev mode, use __BUILD_HASH__ and compute time client-side for freshness
      return `__DIRTY__${hash}`;
    }
    const commitDate = execSync('TZ=UTC git log -1 --format=%cd --date=format-local:"%Y-%m-%d %H:%M:%S UTC"').toString().trim();
    return `${commitDate} ${hash}`;
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
      output: {
        // Split vendor chunks for better caching
        manualChunks(id) {
          if (id.includes('node_modules/phaser3-rex-plugins')) {
            return 'rexui';
          }
          if (id.includes('node_modules/phaser')) {
            return 'phaser';
          }
        },
      },
    },
  },
  esbuild: {
    // Strip console.log/debug in production; keep console.error/warn
    pure: process.env.NODE_ENV === 'production' ? ['console.log', 'console.debug'] : [],
  },
  plugins: [
    // Generate bundle analysis (run: npm run build && open stats.html)
    visualizer({
      filename: 'stats.html',
      open: false,
      gzipSize: true,
    }),
  ],
  server: {
    port: 3000,
    strictPort: true,
    open: false,
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
