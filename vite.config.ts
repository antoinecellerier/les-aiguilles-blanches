import { defineConfig, loadEnv, type Plugin } from 'vite';
import { resolve } from 'path';
import { execSync } from 'child_process';
import { visualizer } from 'rollup-plugin-visualizer';

// Get git commit hash and build date for version string
function getVersion() {
  try {
    const hash = execSync('git rev-parse --short HEAD').toString().trim();
    const dirty = execSync('git status --porcelain').toString().trim();
    if (dirty) {
      // Use mtime of the most recently modified tracked/untracked file
      const mtime = execSync(
        'find src/ -type f -newer .git/index -printf "%T@ %p\\n" 2>/dev/null | sort -rn | head -1 | cut -d" " -f1'
      ).toString().trim();
      let dirtyDate: string;
      if (mtime) {
        dirtyDate = new Date(parseFloat(mtime) * 1000).toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
      } else {
        // Fallback to latest commit date if no files newer than index
        dirtyDate = execSync('TZ=UTC git log -1 --format=%cd --date=format-local:"%Y-%m-%d %H:%M:%S UTC"').toString().trim();
      }
      return `${dirtyDate} ${hash}-dirty`;
    }
    const commitDate = execSync('TZ=UTC git log -1 --format=%cd --date=format-local:"%Y-%m-%d %H:%M:%S UTC"').toString().trim();
    return `${commitDate} ${hash}`;
  } catch {
    return 'dev';
  }
}

// Dev-only plugin: serves /api/version with live git hash on every request
function liveVersionPlugin(): Plugin {
  return {
    name: 'live-version',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/version', (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ version: getVersion() }));
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Load .env.local so non-VITE_ vars like PORT are available
  const env = loadEnv(mode, process.cwd(), '');
  return {
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
    liveVersionPlugin(),
    // Generate bundle analysis (run: npm run build && open stats.html)
    visualizer({
      filename: 'stats.html',
      open: false,
      gzipSize: true,
    }),
  ],
  server: {
    port: parseInt(env.PORT || '3000'),
    strictPort: true,
    open: false,
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  };
});
