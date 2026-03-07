import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../dist/webview',
    emptyOutDir: false,
    rollupOptions: {
      input: path.resolve(__dirname, 'src/runner-main.tsx'),
      output: {
        format: 'iife',
        entryFileNames: 'runner.js',
        chunkFileNames: 'chunks/runner-[name].[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'runner.css';
          }
          return 'assets/runner-[name].[hash][extname]';
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
