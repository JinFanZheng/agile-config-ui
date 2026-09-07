import { expect, test } from '@playwright/test'

/**
 * ITER-05 发布链路（M3 DoD）：改配置 → diff 预览 → 发布 → 历史可见 → 回滚 v1 → 值恢复；
 * 附加：部分发布（ids，实测支持）与单条配置历史。
 * 数据纪律：自建 e2e_pub_* 应用，afterAll 清理。
 */
const ADMIN_USER = process.env.E2E_ADMIN_USER || 'admin'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || ''
const APP_ID = `e2e_pub_${Date.now().toString(36)}`

test.skip(!ADMIN_PASSWORD, '未配置 E2E_ADMIN_PASSWORD')
test.describe.configure({ mode: 'serial' })

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('用户名').fill(ADMIN_USER)
  await page.getByLabel('密码').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: '登录' }).click()
  await page.waitForURL(/\/$/)
}

test.beforeAll(async ({ request }) => {
  const { token } = await (
    await request.post('/admin/jwt/login', {
      data: { userName: ADMIN_USER, password: ADMIN_PASSWORD },
    })
  ).json()
  await request.post('/App/Add', {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      id: APP_ID,
      name: 'e2e发布链路',
      group: '',
      enabled: true,
      inheritanced: false,
      inheritancedApps: [],
    },
  })
})

test.afterAll(async ({ request }) => {
  const { token } = await (
    await request.post('/admin/jwt/login', {
      data: { userName: ADMIN_USER, password: ADMIN_PASSWORD },
    })
  ).json()
  await request.post(`/App/Delete?id=${APP_ID}`, { headers: { Authorization: `Bearer ${token}` } })
})

test('发布链路全流程：diff 预览 → 发布 v1/v2 → 版本对比 → 回滚恢复', async ({ page }) => {
  await login(page)

  // 准备两条待发布配置（API 建数据，UI 走发布）
  const ctx = page.request
  const { token } = await (
    await ctx.post('/admin/jwt/login', {
      data: { userName: ADMIN_USER, password: ADMIN_PASSWORD },
    })
  ).json()
  const auth = { Authorization: `Bearer ${token}` }
  for (const [k, v] of [
    ['conf_a', '1'],
    ['conf_b', '2'],
  ] as const) {
    await ctx.post('/Config/Add?env=DEV', {
      headers: auth,
      data: { appId: APP_ID, group: '', key: k, value: v },
    })
  }

  // 发布 v1：强制 diff 预览 + log 必填
  await page.goto(`/apps/${APP_ID}/config`)
  await expect(page.getByText('新增 2')).toBeVisible({ timeout: 15_000 })
  await page.getByRole('button', { name: '发布…' }).click()
  await expect(page.getByRole('dialog', { name: '发布确认' })).toBeVisible()
  await expect(page.getByRole('dialog').getByText('新增 2')).toBeVisible()
  // diff 行内容可见（conf_a 旧值 — 新值 1）
  await expect(page.getByRole('dialog').getByText('conf_a')).toBeVisible()
  // log 必填：不填说明发布键不可用
  await expect(page.getByRole('button', { name: '发布 2 项变更' })).toBeDisabled()
  await page.getByLabel('发布说明').fill('v1 基线')
  await page.getByRole('button', { name: '发布 2 项变更' }).click()
  await expect(page.getByText('已发布')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('当前环境没有待发布改动')).toBeVisible({ timeout: 15_000 })

  // 改 conf_a=10、新增 conf_c=3，再发布 v2
  await page.getByRole('button', { name: '1', exact: true }).click()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.type('10')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: '10' })).toBeVisible({ timeout: 15_000 })

  await page.getByRole('button', { name: '新建配置' }).click()
  await page.getByLabel('键').fill('conf_c')
  await page.getByLabel('值').fill('3')
  await page.getByRole('button', { name: '创建', exact: true }).click()
  await expect(page.locator('[data-testid=config-table]').getByText('conf_c')).toBeVisible({
    timeout: 15_000,
  })

  await page.getByRole('button', { name: '发布…' }).click()
  // v2 diff：修改 1（conf_a 1→10）+ 新增 1（conf_c）
  await expect(page.getByRole('dialog').getByText('修改 1')).toBeVisible()
  await expect(page.getByRole('dialog').getByText('新增 1')).toBeVisible()
  await expect(page.getByRole('dialog').getByText('10')).toBeVisible()
  await page.getByLabel('发布说明').fill('v2 调整 conf_a、新增 conf_c')
  await page.getByRole('button', { name: '发布 2 项变更' }).click()
  await expect(page.getByText('当前环境没有待发布改动')).toBeVisible({ timeout: 15_000 })

  // 发布历史（主从双栏）：默认展示最新版详情；点 v1 看单版；再点 v2 直接对比
  await page.getByRole('link', { name: '发布历史 →' }).click()
  await expect(page.getByRole('heading', { name: '发布历史' })).toBeVisible()
  await expect(page.getByText('v1 基线')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('button', { name: /v2 调整 conf_a/ })).toBeVisible()
  // 默认右栏为最新版（v2）：快照可见、回滚禁用（当前版本）
  await expect(page.getByText(/本版本配置快照/)).toBeVisible()
  await expect(page.getByRole('button', { name: '回滚到此版本' })).toBeDisabled()

  // 点 v1 → 单版详情（与前版差异提示首版 + 快照）
  await page.getByRole('button', { name: /v1 基线/ }).click()
  await expect(page.getByText('这是第一个版本（无前版可对比）')).toBeVisible()

  // 再点 v2 → 两版 diff（面板内直接显示，无弹窗）
  await page.getByRole('button', { name: /v2 调整 conf_a/ }).click()
  await expect(page.getByText(/版本对比：v1 → v2/)).toBeVisible()
  await expect(page.getByText('conf_a', { exact: true })).toBeVisible()
  await expect(page.getByText('conf_c', { exact: true })).toBeVisible()

  // 回滚到 v1：点 v2 取消选择 → v1 详情 → 面板底部回滚（二次确认，明示版本）
  await page.getByRole('button', { name: /v2 调整 conf_a/ }).click()
  await expect(page.getByRole('button', { name: '回滚到此版本' })).toBeEnabled()
  await page.getByRole('button', { name: '回滚到此版本' }).click()
  await expect(page.getByRole('alertdialog')).toBeVisible()
  await page.getByRole('alertdialog').getByRole('button', { name: '确认回滚' }).click()
  await expect(page.getByText(/已回滚到 v1/)).toBeVisible({ timeout: 15_000 })

  // 值恢复：conf_a=1、conf_c 移除
  await page.goto(`/apps/${APP_ID}/config`)
  await expect(page.getByRole('button', { name: '1', exact: true })).toBeVisible({
    timeout: 15_000,
  })
  await expect(page.locator('[data-testid=config-table]').getByText('conf_c')).toHaveCount(0, {
    timeout: 15_000,
  })

  // 单条配置历史（conf_a 有两个版本的值记录；按行收窄避免歧义）
  const conf_a_row = page.locator('[data-testid=config-table] div.grid:has-text("conf_a")')
  await conf_a_row.getByRole('button', { name: '历史' }).click()
  const itemHistory = page.getByRole('dialog', { name: /conf_a · 发布历史/ })
  await expect(itemHistory).toBeVisible()
  await expect(itemHistory.getByText('v1 基线')).toBeVisible()
  await page.keyboard.press('Escape')
})

test('部分发布（ids）：只发勾选项，其余保持待发布', async ({ page }) => {
  await login(page)

  const ctx = page.request
  const { token } = await (
    await ctx.post('/admin/jwt/login', {
      data: { userName: ADMIN_USER, password: ADMIN_PASSWORD },
    })
  ).json()
  const auth = { Authorization: `Bearer ${token}` }
  for (const [k, v] of [
    ['part_d', '4'],
    ['part_e', '5'],
  ] as const) {
    await ctx.post('/Config/Add?env=DEV', {
      headers: auth,
      data: { appId: APP_ID, group: '', key: k, value: v },
    })
  }

  await page.goto(`/apps/${APP_ID}/config`)
  await expect(page.getByText('新增 2')).toBeVisible({ timeout: 15_000 })
  await page.getByRole('button', { name: '发布…' }).click()
  // 取消勾选 part_e → 只发布 part_d
  await page.getByRole('dialog').getByRole('button', { name: '发布 part_e' }).click()
  await page.getByLabel('发布说明').fill('部分发布 only part_d')
  await page.getByRole('button', { name: '发布 1 项变更' }).click()
  await expect(page.getByText('已发布')).toBeVisible({ timeout: 15_000 })
  // part_e 仍待发布
  await expect(page.getByText('新增 1')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('[data-testid=config-table]').getByText('part_e')).toBeVisible()
})
