import { expect, test } from '@playwright/test'

/**
 * M0 冒烟：登录链路 + 401 全局拦截。
 * 凭证来自 .env.e2e（gitignore，见 .env.e2e.example）；不触碰 demo_app 数据。
 */
const ADMIN_USER = process.env.E2E_ADMIN_USER || 'admin'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || ''

test.describe.configure({ mode: 'serial' })

test('无效 token：访问受保护路由被清除会话并重定向登录（记录来源）', async ({ page }) => {
  const bogusSession = JSON.stringify({
    state: { token: 'bogus-token', user: { userName: 'ghost', roles: [], functions: [] } },
    version: 0,
  })
  // 先落登录页拿到同源 localStorage 写入权（不用 addInitScript：它每次导航都会重放，会抵消 401 清除）
  await page.goto('/login')
  await page.evaluate((s) => localStorage.setItem('agile-config-ui.session', s), bogusSession)
  // 概览页端点多匿名（Report/* 面向客户端 SDK），走需鉴权的应用列表触发 401
  await page.goto('/apps')

  await expect(page).toHaveURL(/\/login\?from=%2Fapps/)
  // 等 401 重试与重定向链全部落定（retry 会触发第二次跳转，与 evaluate 竞态）
  await page.waitForLoadState('networkidle')
  const session = await page.evaluate(() => localStorage.getItem('agile-config-ui.session'))
  expect(JSON.parse(session ?? '{}').state.token).toBeNull()
})

test('管理员登录：进入概览并显示当前用户', async ({ page }) => {
  test.skip(!ADMIN_PASSWORD, '未配置 E2E_ADMIN_PASSWORD（复制 .env.e2e.example 为 .env.e2e）')
  await page.goto('/login')
  await page.screenshot({ path: 'test-results/m0-login.png' })

  await page.getByLabel('用户名').fill(ADMIN_USER)
  await page.getByLabel('密码').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: '登录' }).click()

  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('banner').getByText(ADMIN_USER)).toBeVisible()
  await expect(page.getByText('当前会话', { exact: true })).toBeVisible()
  await page.screenshot({ path: 'test-results/m0-home.png' })
})

test('登出：清会话回到登录页', async ({ page }) => {
  test.skip(!ADMIN_PASSWORD, '未配置 E2E_ADMIN_PASSWORD')
  await page.goto('/login')
  await page.getByLabel('用户名').fill(ADMIN_USER)
  await page.getByLabel('密码').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: '登录' }).click()
  await expect(page).toHaveURL(/\/$/)

  await page.getByRole('button', { name: new RegExp(ADMIN_USER) }).click()
  await page.getByRole('menuitem', { name: '退出登录' }).click()
  await expect(page).toHaveURL(/\/login/)
})
