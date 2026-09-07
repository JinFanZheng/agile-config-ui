import { expect, test } from '@playwright/test'

/**
 * ITER-09 设置中心冒烟：设置页即时生效 + 刷新持久 + 老键（agile-config-ui.theme）无感迁移。
 * 依赖登录态（设置页在受保护路由内）；凭证见 .env.e2e。
 */
const ADMIN_USER = process.env.E2E_ADMIN_USER || 'admin'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || ''

const SETTINGS_KEY = 'agile-config-ui.settings'
const LEGACY_THEME_KEY = 'agile-config-ui.theme'

test.skip(!ADMIN_PASSWORD, '未配置 E2E_ADMIN_PASSWORD')

test.describe.configure({ mode: 'serial' })

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('用户名').fill(ADMIN_USER)
  await page.getByLabel('密码').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: '登录' }).click()
  await expect(page).toHaveURL(/\/$/)
}

/** 还原本地偏好，避免影响其他用例与本地体验 */
async function resetSettings(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    localStorage.setItem(
      'agile-config-ui.settings',
      JSON.stringify({
        state: { theme: 'graphite', uiFontSize: 'standard', editorFontSize: 12, motion: true },
        version: 0,
      })
    )
    localStorage.removeItem('agile-config-ui.theme')
  })
}

test('设置页四项控件就位且即时生效', async ({ page }) => {
  await login(page)
  await page.goto('/settings')
  await expect(page.getByRole('heading', { name: '设置' })).toBeVisible()

  const themeGroup = page.getByRole('radiogroup', { name: '主题' })
  await expect(themeGroup).toBeVisible()
  await expect(page.getByRole('radiogroup', { name: '界面字号' })).toBeVisible()
  await expect(page.getByRole('radiogroup', { name: '编辑器字号' })).toBeVisible()
  await expect(page.getByRole('switch', { name: '界面动效' })).toBeVisible()
})

test('设置页与顶栏切换器双向同步主题', async ({ page }) => {
  await login(page)
  await page.goto('/settings')

  // 设置页选深蓝中控 → html 即时切换，顶栏按钮名跟随
  await page.getByRole('radio', { name: '深蓝中控' }).check()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'navy-console')
  await expect(page.getByRole('button', { name: '深蓝中控' })).toBeVisible()

  // 顶栏切回石墨 → 设置页单选状态跟随（双向同步）
  await page.getByRole('button', { name: '深蓝中控' }).click()
  await page.getByRole('menuitemradio', { name: '石墨' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'graphite')
  await expect(page.getByRole('radio', { name: '石墨' })).toBeChecked()
})

test('界面字号与动效开关：即时生效且刷新后保持', async ({ page }) => {
  await login(page)
  await page.goto('/settings')

  await page.getByRole('radio', { name: '紧凑' }).check()
  await expect(page.locator('html')).toHaveAttribute('data-ui-font', 'compact')
  const rootFont = await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)
  expect(parseFloat(rootFont)).toBeLessThan(16)

  await page.getByRole('switch', { name: '界面动效' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'off')

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-ui-font', 'compact')
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'off')

  // 还原
  await page.getByRole('radio', { name: '标准' }).check()
  await page.getByRole('switch', { name: '界面动效' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-ui-font', 'standard')
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'on')
})

test('编辑器字号持久化到统一设置键', async ({ page }) => {
  await login(page)
  await page.goto('/settings')

  await page.getByRole('radio', { name: '15', exact: true }).check()
  const raw = await page.evaluate((key) => localStorage.getItem(key), SETTINGS_KEY)
  expect(JSON.parse(raw!).state.editorFontSize).toBe(15)

  await page.reload()
  await expect(page.getByRole('radio', { name: '15', exact: true })).toBeChecked()

  await page.getByRole('radio', { name: '12', exact: true }).check()
})

test('老主题键无感迁移：新键缺失时回退读取 agile-config-ui.theme', async ({ page }) => {
  await login(page)
  // 造老用户现场：只留老键（navy-console 深色，同时验证无白闪铺底）
  await page.evaluate(
    ([next, legacy]) => {
      localStorage.removeItem(next)
      localStorage.setItem(legacy, JSON.stringify({ state: { theme: 'navy-console' }, version: 0 }))
    },
    [SETTINGS_KEY, LEGACY_THEME_KEY] as const
  )
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'navy-console')
  // 引导脚本同步铺深色 html 背景（防白闪），值 = navy-console --bg-page 令牌
  const bg = await page.evaluate(() => document.documentElement.style.backgroundColor)
  expect(bg).toBe('rgb(10, 20, 36)')
  // 应用启动即迁移：新键已写入、老键已删除
  const migrated = await page.evaluate(
    ([next, legacy]) => ({ next: localStorage.getItem(next), legacy: localStorage.getItem(legacy) }),
    [SETTINGS_KEY, LEGACY_THEME_KEY] as const
  )
  expect(JSON.parse(migrated.next!).state.theme).toBe('navy-console')
  expect(migrated.legacy).toBeNull()

  // 串行模式收尾：还原本地偏好，避免影响其他用例与本地体验
  await resetSettings(page)
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'graphite')
  await expect(page.locator('html')).toHaveAttribute('data-ui-font', 'standard')
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'on')
})
