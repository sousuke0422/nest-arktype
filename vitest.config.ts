import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: './',
    environment: 'node',
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    // Run tests sequentially to avoid state sharing issues
    fileParallelism: false,
  },
  plugins: [
    swc.vite({
      module: {
        type: 'es6',
      },
    }),
  ],
});
