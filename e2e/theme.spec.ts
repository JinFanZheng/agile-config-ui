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

/** ITER-12 盲盒皮肤：5 套新主题逐个切换（顶栏切换器），即时生效 + 刷新持久 + 防闪屏内联底正确 */
const NEW_THEMES: { id: string; label: string; bodyBg: string; htmlBg: string }[] = [
  { id: 'obsidian', label: '曜石', bodyBg: 'rgb(0, 0, 0)', htmlBg: 'rgb(0, 0, 0)' },
  { id: 'violet-night', label: '紫夜', bodyBg: 'rgb(18, 15, 30)', htmlBg: 'rgb(18, 15, 30)' },
  { id: 'sakura', label: '樱粉', bodyBg: 'rgb(253, 247, 249)', htmlBg: 'rgb(253, 247, 249)' },
  { id: 'mocha', label: '摩卡', bodyBg: 'rgb(22, 18, 11)', htmlBg: 'rgb(22, 18, 11)' },
  { id: 'forest', label: '森夜', bodyBg: 'rgb(12, 20, 16)', htmlBg: 'rgb(12, 20, 16)' },
]

for (const t of NEW_THEMES) {
  test(`盲盒皮肤切换：${t.label}（${t.id}）`, async ({ page }) => {
    await login(page)

    // 顶栏切换器当前主题名即按钮名（从默认石墨起切）
    await page.getByRole('button', { name: '石墨' }).click()
    await page.getByRole('menuitemradio', { name: t.label }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', t.id)

    // 即时生效：body 背景与 html 内联防闪屏底同为主题 --bg-page
    const bgs = await page.evaluate(() => ({
      body: getComputedStyle(document.body).backgroundColor,
      html: document.documentElement.style.backgroundColor,
    }))
    expect(bgs.body).toBe(t.bodyBg)
    expect(bgs.html).toBe(t.htmlBg)

    // 刷新持久 + 引导脚本铺同色底（深色主题不白闪的前提）
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', t.id)
    const after = await page.evaluate(() => ({
      body: getComputedStyle(document.body).backgroundColor,
      html: document.documentElement.style.backgroundColor,
    }))
    expect(after.body).toBe(t.bodyBg)
    expect(after.html).toBe(t.htmlBg)

    // 还原默认
    await page.getByRole('button', { name: t.label }).click()
    await page.getByRole('menuitemradio', { name: '石墨' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'graphite')
  })
}

test('切换器分组：跟随系统 + 浅色/深色两组', async ({ page }) => {
  await login(page)
  await page.getByRole('button', { name: '石墨' }).click()
  const menu = page.getByRole('menu', { name: '主题' })
  await expect(menu.getByRole('menuitemradio', { name: '跟随系统' })).toBeVisible()
  await expect(menu.getByRole('group', { name: '浅色' })).toBeVisible()
  await expect(menu.getByRole('group', { name: '深色' })).toBeVisible()
  // 浅色组 5 项 + 深色组 5 项 + 跟随系统 1 项
  await expect(menu.getByRole('group', { name: '浅色' }).getByRole('menuitemradio')).toHaveCount(5)
  await expect(menu.getByRole('group', { name: '深色' }).getByRole('menuitemradio')).toHaveCount(5)
  // 有且仅有一项选中（跟随系统的显示器图标不得被误当作选中态）
  await expect(menu.locator('[aria-checked="true"]')).toHaveCount(1)
  await expect(menu.getByRole('menuitemradio', { name: '石墨' })).toHaveAttribute('aria-checked', 'true')
  await page.keyboard.press('Escape')
})

test('跟随系统：随系统深浅实时切换、刷新持久且 boot 铺对应底色', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await login(page)

  await page.getByRole('button', { name: '石墨' }).click()
  await page.getByRole('menuitemradio', { name: '跟随系统' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'navy-console')

  // 系统切浅色：不刷新实时跟随
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'graphite')

  // 切回深色后刷新：boot 脚本按（模拟的）系统深色解析并铺深色底（防白闪）
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'navy-console')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'navy-console')
  expect(await page.evaluate(() => document.documentElement.style.backgroundColor)).toBe('rgb(10, 20, 36)')
  // 切换器按钮显示"跟随系统"
  await expect(page.getByRole('button', { name: '跟随系统' })).toBeVisible()

  // 还原：显式石墨（并复位媒体模拟）
  await page.getByRole('button', { name: '跟随系统' }).click()
  await page.getByRole('menuitemradio', { name: '石墨' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'graphite')
  await page.emulateMedia({ colorScheme: 'light' })
})
