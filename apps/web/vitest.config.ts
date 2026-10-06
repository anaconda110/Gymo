import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Vitest 配置：纯本地单测，node 环境 + fake-indexeddb 提供 IndexedDB。
// 仅作为 devDependency 用于测试，不进入运行时产物。
export default defineConfig({
  plugins: [svelte()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    globals: false
  }
});