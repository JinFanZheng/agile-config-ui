import { expect, test } from '@playwright/test'

/**
 * ITER-06 运维视图：概览仪表 / 节点管理 / 系统日志 / 客户端（本机实例无嵌入式客户端，验证空态）。
 * 节点用例使用随机假地址节点并在用例内删除；不动 demo_app。
 */
const ADMIN_USER = process.env.E2E_ADMIN_USER || 'admin'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || ''

test.skip(!ADMIN_PASSWORD, '未配置 E2E_ADMIN_PASSWORD')

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('用户名').fill(ADMIN_USER)
  await page.getByLabel('密码').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: '登录' }).click()
  await page.waitForURL(/\/$/)
}

test('概览仪表：统计卡/系统信息/会话', async ({ page }) => {
  await login(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '概览' })).toBeVisible()
  // 统计卡数值渲染（数字）
  await expect(page.getByText('启用应用')).toBeVisible()
  await expect(page.getByText('1.13.2.0', { exact: true })).toBeVisible({ timeout: 15_000 })
  // 环境清单来自 Home/Sys（本机实例含 STAGING）
  await expect(page.getByRole('main').getByText('STAGING')).toBeVisible()
})

test('节点管理：添加 → 离线徽标 → 删除', async ({ page }) => {
  await login(page)
  await page.goto('/nodes')
  await expect(page.getByRole('heading', { name: '节点管理' })).toBeVisible()

  const addr = `e2e-node-${Date.now().toString(36)}:5000`
  await page.getByRole('button', { name: '添加节点' }).click()
  await page.getByLabel('节点地址').fill(addr)
  await page.getByLabel('备注', { exact: true }).fill('e2e 临时节点')
  await page.getByRole('button', { name: '添加', exact: true }).click()
  await expect(page.getByRole('cell', { name: addr, exact: true })).toBeVisible({ timeout: 15_000 })
  await expect(page.locator(`tr:has-text("${addr}")`).getByText('离线')).toBeVisible()

  await page.locator(`tr:has-text("${addr}")`).getByRole('button', { name: '删除' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: '删除' }).click()
  await expect(page.getByRole('cell', { name: addr, exact: true })).toHaveCount(0, {
    timeout: 15_000,
  })
})

test('系统日志：列表 + 类型过滤', async ({ page }) => {
  await login(page)
  await page.goto('/logs')
  await expect(page.getByRole('heading', { name: '系统日志' })).toBeVisible()
  // 本机实例已有大量日志
  await expect(page.getByText('admin login successful').first()).toBeVisible({ timeout: 15_000 })

  // 类型过滤：警告
  await page.getByLabel('日志类型').selectOption('1')
  await expect(page.locator('tbody').getByText('警告').first()).toBeVisible({ timeout: 15_000 })
})

test('客户端：页面渲染（空态或在线行，视本机是否有 SDK 客户端）', async ({ page }) => {
  await login(page)
  await page.goto('/clients')
  await expect(page.getByRole('heading', { name: '客户端' })).toBeVisible()
  // 本机可能运行着 C# 验证客户端（tools/verify-client）——空态与在线行二选一均可接受
  // 本机可能运行着 C# 验证客户端——空态与在线行二选一
  await page.waitForTimeout(1200)
  const hasRow = (await page.locator('tbody tr').count()) > 0
  if (!hasRow) {
    await expect(page.getByText('暂无在线客户端')).toBeVisible({ timeout: 15_000 })
  }
  // 危险操作入口在（仅验证存在，不触发）
  await expect(page.getByRole('button', { name: '重载全部客户端' })).toBeVisible()
})
