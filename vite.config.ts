import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: 'src',
  publicDir: '../public',
  build: { outDir: '../dist', emptyOutDir: true, target: 'es2023' },
  test: { root: '.', include: ['test/**/*.test.ts'] },
});
