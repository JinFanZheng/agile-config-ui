import { devices, expect, test } from '@playwright/test'

/**
 * ITER-17 H5 适配回归：iPhone 12（390×844 触屏）下
 * 顶栏环境切换器完整可见（修复 EnvSwitcher 被 flex 压缩裁切）、
 * 关键页面无页面级横向溢出、抽屉分组导航可用、Diff inline 单栏。
 * 凭证见 .env.e2e；demo_app 只读查看。
 */
const ADMIN_USER = process.env.E2E_ADMIN_USER || 'admin'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || ''

test.skip(!ADMIN_PASSWORD, '未配置 E2E_ADMIN_PASSWORD')

// iPhone 12 描述符默认 webkit；本机只装 chromium，套壳用 chromium 保留视口/触屏特征
test.use({ ...devices['iPhone 12'], browserName: 'chromium' })

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('用户名').fill(ADMIN_USER)
  await page.getByLabel('密码').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: '登录' }).click()
  await page.waitForURL(/\/$/)
}

test('移动端顶栏：环境切换器完整可见且可切换（回归 EnvSwitcher 裁切）', async ({ page }) => {
  await login(page)
  const prod = page.getByRole('radio', { name: 'PROD' })
  await expect(prod).toBeVisible()
  // 修复点：PROD 右缘不得超出视口（曾因 header flex 压缩被 overflow-hidden 裁掉）
  const inView = await prod.evaluate((el) => el.getBoundingClientRect().right <= window.innerWidth + 0.5)
  expect(inView, 'PROD 按钮应在视口内').toBe(true)
  await prod.click()
  await expect(prod).toHaveAttribute('aria-checked', 'true')
  // 还原默认环境，避免影响其他用例
  await page.getByRole('radio', { name: 'DEV' }).click()
  await expect(page.getByRole('radio', { name: 'DEV' })).toHaveAttribute('aria-checked', 'true')
})

test('移动端关键页面无页面级横向溢出（表格在卡片内横向滚动为既定模式）', async ({ page }) => {
  await login(page)
  const paths = ['/', '/apps', '/apps/demo_app/config', '/apps/demo_app/config?view=json', '/history', '/clients', '/logs', '/guide', '/settings']
  for (const path of paths) {
    await page.goto(path)
    await page.waitForTimeout(400)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, `${path} 页面级横向溢出 ${overflow}px`).toBeLessThanOrEqual(0)
  }
})

test('移动端抽屉：分组导航打开可用、点击跳转后自动收起', async ({ page }) => {
  await login(page)
  await page.getByRole('button', { name: '打开导航菜单' }).click()
  const drawer = page.locator('aside')
  await expect(drawer.getByText('配置管理', { exact: true })).toBeVisible()
  await expect(drawer.getByText('权限管理', { exact: true })).toBeVisible()
  await drawer.getByRole('link', { name: '应用' }).click()
  await expect(page.getByRole('heading', { name: '应用' })).toBeVisible()
  // 点击导航后抽屉收起（md 以下回 hidden）
  await expect(drawer).toBeHidden()
})

test('移动端 KV 对比：Diff inline 单栏渲染（窄屏不并排）', async ({ page }) => {
  await login(page)
  await page.goto('/apps/demo_app/config?view=kv')
  await page.getByRole('button', { name: '对比已保存' }).click()
  await page.waitForSelector('.view-lines', { timeout: 15_000 })
  await page.waitForTimeout(800)
  // inline 模式：original 编辑器壳被折叠成窄条（<80px；并排时为一整个可读栏 ≈ 半宽）
  const origW = await page.evaluate(() => {
    const el = document.querySelector('.editor.original, .original')
    return el ? Math.round(el.getBoundingClientRect().width) : -1
  })
  expect(origW, 'original 侧应为折叠窄条（inline），实际宽度').toBeLessThan(80)
  // 桌面宽度恢复并排由 useMediaQuery 驱动（单测覆盖），此处仅回归移动行为
})
