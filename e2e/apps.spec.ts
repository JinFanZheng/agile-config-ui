import { expect, test } from '@playwright/test'

/**
 * ITER-03 应用管理全链路：创建 → 编辑 → 禁用/启用 → 删除。
 * 数据纪律（handoff §9）：随机前缀自建应用并在用例内清理；禁止动 demo_app。
 */
const ADMIN_USER = process.env.E2E_ADMIN_USER || 'admin'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || ''
const APP_ID = `e2e_${Date.now().toString(36)}_app`

test.skip(!ADMIN_PASSWORD, '未配置 E2E_ADMIN_PASSWORD')

test.describe.configure({ mode: 'serial' })

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('用户名').fill(ADMIN_USER)
  await page.getByLabel('密码').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: '登录' }).click()
  await page.waitForURL(/\/$/)
}

test('应用全生命周期：创建→编辑→启停→删除', async ({ page }) => {
  await login(page)
  await page.goto('/apps')
  await expect(page.getByRole('heading', { name: '应用' })).toBeVisible()

  // 创建：ID 自动生成，可覆盖（先残留一个无匹配过滤词——ISSUE-001 回归：创建后应自动清除）
  await page.getByPlaceholder('搜索应用名 / AppId…').fill('zzz_no_match')
  await page.getByRole('button', { name: '新建应用' }).click()
  await expect(page.getByRole('dialog', { name: '新建应用' })).toBeVisible()
  const autoId = await page.getByLabel('AppId').inputValue()
  expect(autoId).toMatch(/^app-[a-z0-9]{8}$/)
  await page.getByLabel('AppId').fill(APP_ID)
  await page.getByLabel('应用名称').fill('e2e 生命周期应用')
  await page.getByRole('button', { name: '创建', exact: true }).click()
  await expect(page.getByRole('cell', { name: APP_ID, exact: true })).toBeVisible()
  await expect(page.locator('tbody').getByText('e2e 生命周期应用')).toBeVisible()
  await expect(page.getByText('已创建')).toBeVisible()

  // 编辑：改名
  await page.locator(`tr:has-text("${APP_ID}")`).getByRole('button', { name: '编辑' }).click()
  await page.getByLabel('应用名称').fill('e2e 生命周期应用v2')
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.locator('tbody').getByText('e2e 生命周期应用v2')).toBeVisible()

  // 禁用 → 启用（二次确认；确认按钮与行内按钮同名，按 alertdialog 作用域区分）
  await page.locator(`tr:has-text("${APP_ID}")`).getByRole('button', { name: '禁用' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: '禁用' }).click()
  await expect(page.locator(`tr:has-text("${APP_ID}")`).getByText('已禁用')).toBeVisible()

  await page.locator(`tr:has-text("${APP_ID}")`).getByRole('button', { name: '启用' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: '启用' }).click()
  await expect(page.locator(`tr:has-text("${APP_ID}")`).getByText('已启用')).toBeVisible()

  // Secret 查看与复制
  await page.locator(`tr:has-text("${APP_ID}")`).getByRole('button', { name: 'Secret' }).click()
  await expect(page.getByText('应用凭证')).toBeVisible()
  await page.keyboard.press('Escape')

  // 删除（危险二次确认）
  await page.locator(`tr:has-text("${APP_ID}")`).getByRole('button', { name: '删除' }).click()
  await expect(page.getByText('此操作不可恢复')).toBeVisible()
  await page.getByRole('alertdialog').getByRole('button', { name: '删除' }).click()
  await expect(page.locator(`tr:has-text("${APP_ID}")`)).toHaveCount(0)
})

test('脏表单保护：填写后 Esc 不直接丢失，需确认放弃', async ({ page }) => {
  await login(page)
  await page.goto('/apps')

  await page.getByRole('button', { name: '新建应用' }).click()
  await page.getByLabel('应用名称').fill('不想丢的草稿')
  await page.keyboard.press('Escape')

  // 脏状态：Esc 先弹放弃确认，取消则表单仍在
  await expect(page.getByText('放弃未保存的修改？')).toBeVisible()
  await page.getByRole('alertdialog').getByRole('button', { name: '取消' }).click()
  await expect(page.getByRole('dialog', { name: '新建应用' })).toBeVisible()
  await expect(page.getByLabel('应用名称')).toHaveValue('不想丢的草稿')

  // 点遮罩同样受守卫保护
  await page.mouse.click(20, 400)
  await expect(page.getByText('放弃未保存的修改？')).toBeVisible()

  // 确认放弃后才关闭
  await page.getByRole('alertdialog').getByRole('button', { name: '放弃修改' }).click()
  await expect(page.getByRole('dialog', { name: '新建应用' })).toHaveCount(0)
})

test.afterAll(async ({ request }) => {
  // 兜底清理：若断言中断残留自建应用，通过 API 删除（不动 demo_app）
  const loginRes = await request.post('/admin/jwt/login', {
    data: { userName: ADMIN_USER, password: ADMIN_PASSWORD },
  })
  const { token } = await loginRes.json()
  await request.post(`/App/Delete?id=${APP_ID}`, { headers: { Authorization: `Bearer ${token}` } })
})
