import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.resolve(__dirname, 'src/ui'),
  plugins: [react(), viteSingleFile()],
  resolve: {
    alias: {
      '@schema': path.resolve(__dirname, 'packages/schema/src'),
      '@engine': path.resolve(__dirname, 'packages/engine/src'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@libraries': path.resolve(__dirname, 'libraries'),
    },
  },
  build: {
    target: 'es2020',
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: false,
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 100_000_000,
    cssCodeSplit: false,
    rollupOptions: {
      input: path.resolve(__dirname, 'src/ui/index.html'),
      output: {
        entryFileNames: 'ui.js',
      },
    },
  },
});
