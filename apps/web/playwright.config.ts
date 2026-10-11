import { defineConfig } from '@playwright/test';

// 仅用于本地无头 e2e 验证核心交互闭环，不影响产物体积与纯本地性。
// 端口可用 GYMO_E2E_PORT 覆盖：本地可能同时跑着其他项目的 vite preview，
// 固定端口会与它们冲突（reuseExistingServer 会误用别的站点）。
const port = Number(process.env.GYMO_E2E_PORT ?? 4173);

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  use: {
    headless: true,
    actionTimeout: 10_000
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' }
    }
  ],
  webServer: {
    command: `npm run preview -- --port ${port} --strictPort`,
    port,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000
  }
});