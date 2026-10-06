import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@vss/shared': path.resolve(__dirname, '../packages/shared/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    testTimeout: 15000,
  },
});
