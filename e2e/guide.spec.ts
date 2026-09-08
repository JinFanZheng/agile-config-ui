import { expect, test } from '@playwright/test'

/**
 * ITER-10 接入指南：路由可达、六节齐全、锚点导航跳转、代码块一键复制。
 * 只读页面（无数据变更），无需自建/清理数据；凭证见 .env.e2e。
 */
const ADMIN_USER = process.env.E2E_ADMIN_USER || 'admin'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || ''

test.skip(!ADMIN_PASSWORD, '未配置 E2E_ADMIN_PASSWORD')

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('用户名').fill(ADMIN_USER)
  await page.getByLabel('密码').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: '登录' }).click()
  await expect(page).toHaveURL(/\/$/)
}

test('接入指南：六节内容 + 锚点导航 + 代码一键复制', async ({ page }) => {
  await login(page)
  await page.goto('/guide')

  // 1) 页面可达，六个分节标题齐全（与目录文案一致）
  await expect(page.getByRole('heading', { name: '接入指南', exact: true })).toBeVisible()
  const sectionNames = [
    '快速开始',
    'C# SDK 接入',
    '依赖注入与 IConfiguration',
    '服务注册与发现',
    '格式与归一化实测坑位',
    'FAQ',
  ]
  for (const name of sectionNames) {
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
  }

  // 2) 锚点导航：点侧栏目录「FAQ」→ 分节滚入主滚动容器视区，且目录高亮跟随
  //    （FAQ 是末节，scrollIntoView 会被滚动钳制，断言以“可见 + 高亮”为准，不断言贴顶）
  await page.locator('[data-testid="guide-toc-desktop"]').getByRole('link', { name: 'FAQ' }).click()
  const faqInView = await page.evaluate(() => {
    const main = document.querySelector('main')
    const el = document.getElementById('faq')
    if (!main || !el) return false
    const m = main.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    return r.top < m.bottom && r.bottom > m.top
  })
  expect(faqInView).toBe(true)
  await expect(
    page.locator('[data-testid="guide-toc-desktop"] a[aria-current="true"]')
  ).toHaveAccessibleName('FAQ')

  // 3) 占位符清晰（G2）：代码示例使用统一占位符，不含真实地址
  await expect(page.getByText('your-app-id').first()).toBeVisible()

  // 4) 一键复制（G2）：复制内容=代码块源码，按钮内联反馈「已复制」（无 Toast）
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  const block = page.locator('[data-testid="guide-code"]').first()
  await block.getByRole('button', { name: '复制', exact: true }).click()
  await expect(block.getByRole('button', { name: '已复制', exact: true })).toBeVisible()
  const clip = await page.evaluate(() => navigator.clipboard.readText())
  expect(clip).toContain('dotnet add package AgileConfig.Client')
})

test('llms.txt / llms-full.txt 可公开获取（AI 助手接入入口，与指南同源）', async ({ request }) => {
  const idx = await request.get('/llms.txt')
  expect(idx.status()).toBe(200)
  // 显式 UTF-8：不带 charset 时中文在部分浏览器按本地编码猜解会乱码（实测反馈）
  expect(idx.headers()['content-type']).toContain('charset=utf-8')
  const idxText = await idx.text()
  expect(idxText).toContain('llms-full.txt')
  expect(idxText).toContain('a:b:c')

  const full = await request.get('/llms-full.txt')
  expect(full.status()).toBe(200)
  expect(full.headers()['content-type']).toContain('charset=utf-8')
  const fullText = await full.text()
  expect(fullText).toContain('## 快速开始')
  expect(fullText).toContain('AddAgileConfig')
  expect(fullText).toContain('IOptionsMonitor')
  // 与指南同源占位符纪律：不含实例地址/演示应用
  expect(fullText).not.toContain('localhost:5017')
  expect(fullText).not.toContain('demo_app')
})
