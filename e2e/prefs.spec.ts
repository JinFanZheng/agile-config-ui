import { expect, test } from '@playwright/test'

/**
 * ITER-24 体验三项回归：侧栏折叠（桌面持久/移动抽屉不受影响）、登录后落地页、列表分页大小。
 * 凭证见 .env.e2e；demo_app 只读；业务数据零写入。
 */
const ADMIN_USER = process.env.E2E_ADMIN_USER || 'admin'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || ''
const SETTINGS_KEY = 'agile-config-ui.settings'

test.skip(!ADMIN_PASSWORD, '未配置 E2E_ADMIN_PASSWORD')

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('用户名').fill(ADMIN_USER)
  await page.getByLabel('密码').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: '登录' }).click()
  await page.waitForURL(/\/(apps)?$/)
}

test('侧栏折叠：图标栏模式、可访问名保留、刷新持久、展开还原', async ({ page }) => {
  await login(page)
  const aside = page.locator('aside')

  await page.getByRole('button', { name: '收起侧栏' }).click()
  await expect(aside).toHaveClass(/w-14/)
  // 文字进 sr-only（可访问名保留），组标签隐藏
  await expect(aside.getByText('配置管理', { exact: true })).toHaveCount(0)
  await expect(aside.getByRole('link', { name: '应用' })).toBeVisible()

  await page.reload()
  await expect(aside).toHaveClass(/w-14/)

  await page.getByRole('button', { name: '展开侧栏' }).click()
  await expect(aside).toHaveClass(/w-48/)
  await expect(aside.getByText('配置管理', { exact: true })).toBeVisible()

  // 还原持久化默认（展开）
  await page.evaluate((k) => {
    const raw = JSON.parse(localStorage.getItem(k) ?? '{}')
    raw.state = { ...raw.state, sidebarCollapsed: false }
    localStorage.setItem(k, JSON.stringify(raw))
  }, SETTINGS_KEY)
})

test('登录后落地页：设为"应用"后无回跳登录落 /apps，回跳参数仍优先', async ({ page }) => {
  // 设偏好
  await login(page)
  await page.goto('/settings')
  await page.getByRole('radio', { name: '应用' }).check()

  // 造登出态（清会话），直访 /login 无 from
  await page.evaluate(() => localStorage.removeItem('agile-config-ui.session'))
  await page.goto('/login')
  await page.getByLabel('用户名').fill(ADMIN_USER)
  await page.getByLabel('密码').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: '登录' }).click()
  await expect(page).toHaveURL(/\/apps$/)

  // from 回跳优先于偏好：清会话后带 from=/
  await page.evaluate(() => localStorage.removeItem('agile-config-ui.session'))
  await page.goto('/login?from=%2Fclients')
  await page.getByLabel('用户名').fill(ADMIN_USER)
  await page.getByLabel('密码').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: '登录' }).click()
  await expect(page).toHaveURL(/\/clients$/)

  // 还原默认概览
  await page.goto('/settings')
  await page.getByRole('radio', { name: '概览' }).check()
})

test('列表分页大小：设为 50 后应用列表请求 pageSize=50，还原 20', async ({ page }) => {
  await login(page)
  await page.goto('/settings')
  await page.getByRole('radio', { name: '50', exact: true }).check()

  const reqPromise = page.waitForRequest((r) => r.url().includes('/App/Search'))
  await page.goto('/apps')
  const req = await reqPromise
  expect(req.url()).toContain('pageSize=50')

  // 还原
  await page.goto('/settings')
  await page.getByRole('radio', { name: '20', exact: true }).check()
})
