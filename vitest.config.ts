import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@schema': path.resolve(__dirname, 'packages/schema/src'),
      '@engine': path.resolve(__dirname, 'packages/engine/src'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@libraries': path.resolve(__dirname, 'libraries'),
    },
  },
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    environment: 'node',
    globals: false,
    testTimeout: 30_000,
  },
});
