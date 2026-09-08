import { expect, test } from '@playwright/test'

/**
 * ITER-20 生产产物哨兵冒烟：只在 PREVIEW_BASE_URL 指定时运行（本地常规 e2e 跳过）。
 * 背景：lightningcss 生产压缩（#ffffff→#fff）触发 monaco 主题崩溃整页白屏——dev CSS 不压缩，
 * 常规 e2e（dev server）是盲区，故用真实产物（vite preview 或 nginx 容器）跑哨兵。
 * 凭证见 .env.e2e / CI 环境变量；demo_app 只读查看。
 */
const BASE = process.env.PREVIEW_BASE_URL || ''
const ADMIN_USER = process.env.E2E_ADMIN_USER || 'admin'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || ''

test.skip(!BASE || !ADMIN_PASSWORD, '未设置 PREVIEW_BASE_URL（仅生产产物冒烟时运行）')

test('生产产物：登录可用且应用壳完整渲染', async ({ page }) => {
  await page.goto(`${BASE}/login`)
  await page.getByLabel('用户名').fill(ADMIN_USER)
  await page.getByLabel('密码').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: '登录' }).click()
  await page.waitForURL(/\/$/)
  // 应用壳哨兵：顶栏环境切换按钮存在（生产构建 JS 崩溃时整页无按钮）
  await expect(page.getByRole('radio', { name: 'DEV' })).toBeVisible()
})

test('生产产物：KV/JSON 视图与 monaco 正常挂载（#fff 崩溃回归哨兵）', async ({ page }) => {
  await page.goto(`${BASE}/login`)
  await page.getByLabel('用户名').fill(ADMIN_USER)
  await page.getByLabel('密码').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: '登录' }).click()
  await page.waitForURL(/\/$/)

  await page.goto(`${BASE}/apps/demo_app/config?view=kv`)
  await expect(page.getByRole('button', { name: '对比已保存' })).toBeVisible({ timeout: 15_000 })
  await page.goto(`${BASE}/apps/demo_app/config?view=json`)
  await page.waitForSelector('.view-lines', { timeout: 15_000 })
  await expect(page.locator('.monaco-editor').first()).toBeVisible()
})

test('生产产物：llms.txt 可获取且显式 UTF-8（charset 哨兵）', async ({ request }) => {
  const res = await request.get(`${BASE}/llms.txt`)
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type']).toContain('charset=utf-8')
  expect(await res.text()).toContain('llms-full.txt')
})
