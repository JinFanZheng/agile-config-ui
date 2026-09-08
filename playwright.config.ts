import { defineConfig } from '@playwright/test'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.e2e' })

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  // 本机套件共享 dev server(5173) 与后端(5017)：默认并发会把时序敏感用例压出假失败（发布/guide 三次实录），限 2 worker
  workers: 2,
  // 抗抖（ITER-23）：本地与 CI 统一重试一次——首败重跑通过计为 flaky 并在报告标注，不掩盖可复现的真回归
  retries: 1,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm dev',
    url: process.env.E2E_BASE_URL || 'http://localhost:5173',
    reuseExistingServer: true,
  },
})
