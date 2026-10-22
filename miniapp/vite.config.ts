import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Zalo serves built files from a versioned CDN path.
  base: './',
  server: { host: '0.0.0.0', port: 5173 },
  build: {
    outDir: 'dist',
    sourcemap: false,
    polyfillModulePreload: false,
    rollupOptions: {
      output: {
        // Zalo listSyncJS loads the entry as a module bundle.
        entryFileNames: 'assets/index.module.js',
        chunkFileNames: 'assets/[name].module.js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
});
