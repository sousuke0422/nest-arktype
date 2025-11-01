import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: './',
    environment: 'node',
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    // Enable parallel execution for better performance
    // Each test now uses unique class names to avoid conflicts
  },
  plugins: [
    swc.vite({
      module: {
        type: 'es6',
      },
    }),
  ],
});
