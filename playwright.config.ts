import { defineConfig } from '@playwright/test'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.e2e' })

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  // 本机套件共享 dev server(5173) 与后端(5017)：默认并发会把时序敏感用例压出假失败（发布/guide 三次实录），限 2 worker
  workers: 2,
  retries: process.env.CI ? 1 : 0,
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
