import { expect, test } from '@playwright/test'

/**
 * ITER-02 主题引擎验收：默认石墨、切换即时生效、刷新持久。
 * 依赖登录态（切换器在顶栏）；凭证见 .env.e2e。
 */
const ADMIN_USER = process.env.E2E_ADMIN_USER || 'admin'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || ''

test.skip(!ADMIN_PASSWORD, '未配置 E2E_ADMIN_PASSWORD')

test.describe.configure({ mode: 'serial' })

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('用户名').fill(ADMIN_USER)
  await page.getByLabel('密码').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: '登录' }).click()
  await expect(page).toHaveURL(/\/$/)
}

test('新会话默认主题为石墨（graphite）', async ({ page }) => {
  await page.goto('/login')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'graphite')
})

test('顶栏切换主题：即时生效且刷新后保持', async ({ page }) => {
  await login(page)

  await page.getByRole('button', { name: '石墨' }).click()
  await page.getByRole('menuitemradio', { name: '薄荷' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'fresh-mint')
  // 即时生效：body 背景随主题变化（浅青底）
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  expect(bg).toBe('rgb(245, 250, 248)')

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'fresh-mint')

  // 还原默认，避免影响其他用例与本地体验
  await page.getByRole('button', { name: '薄荷' }).click()
  await page.getByRole('menuitemradio', { name: '石墨' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'graphite')
})
