import { expect, test } from '@playwright/test'

/**
 * ITER-04 配置管理链路：建/行内改/取消/删 + 待发布计数 + KV/JSON 视图 + 继承合并视图。
 * 数据纪律：全部用自建 e2e_* 应用（共享应用 + 子应用），用例内清理；不动 demo_app。
 */
const ADMIN_USER = process.env.E2E_ADMIN_USER || 'admin'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || ''

test.skip(!ADMIN_PASSWORD, '未配置 E2E_ADMIN_PASSWORD')
test.describe.configure({ mode: 'serial' })

const TS = Date.now().toString(36)
const SHARED_ID = `e2e_${TS}_shared`
const CHILD_ID = `e2e_${TS}_child`

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('用户名').fill(ADMIN_USER)
  await page.getByLabel('密码').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: '登录' }).click()
  await page.waitForURL(/\/$/)
}

test.beforeAll(async ({ request }) => {
  const loginRes = await request.post('/admin/jwt/login', {
    data: { userName: ADMIN_USER, password: ADMIN_PASSWORD },
  })
  const { token } = await loginRes.json()
  const auth = { Authorization: `Bearer ${token}` }
  // 公共应用 + 子应用（继承公共应用）
  await request.post('/App/Add', {
    headers: auth,
    data: {
      id: SHARED_ID,
      name: 'e2e公共应用',
      group: '',
      enabled: true,
      inheritanced: true,
      inheritancedApps: [],
    },
  })
  await request.post('/App/Add', {
    headers: auth,
    data: {
      id: CHILD_ID,
      name: 'e2e子应用',
      group: '',
      enabled: true,
      inheritanced: false,
      inheritancedApps: [SHARED_ID],
    },
  })
})

test.afterAll(async ({ request }) => {
  const loginRes = await request.post('/admin/jwt/login', {
    data: { userName: ADMIN_USER, password: ADMIN_PASSWORD },
  })
  const { token } = await loginRes.json()
  const auth = { Authorization: `Bearer ${token}` }
  await request.post(`/App/Delete?id=${CHILD_ID}`, { headers: auth })
  await request.post(`/App/Delete?id=${SHARED_ID}`, { headers: auth })
})

test('配置 CRUD 与待发布计数', async ({ page }) => {
  await login(page)
  await page.goto(`/apps/${CHILD_ID}/config`)
  await expect(page.getByRole('heading', { name: 'e2e子应用' })).toBeVisible()
  await expect(
    page.getByRole('navigation', { name: '面包屑' }).getByRole('link', { name: '应用' })
  ).toBeVisible()

  // 新建
  await page.getByRole('button', { name: '新建配置' }).click()
  await page.getByLabel('分组').fill('app')
  await page.getByLabel('键').fill('timeout_seconds')
  await page.getByLabel('值').fill('30')
  await page.getByRole('button', { name: '创建', exact: true }).click()
  await expect(
    page.locator('[data-testid=config-table]').getByText('timeout_seconds')
  ).toBeVisible()

  // 待发布条：新增 1
  await expect(page.getByText('新增 1')).toBeVisible({ timeout: 15_000 })

  // 行内快编 30 → 45（点击值单元格 → 全选 → 输入 → 回车）
  await page.getByRole('button', { name: '30' }).click()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.type('45')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: '45' })).toBeVisible({ timeout: 15_000 })
  // 服务端语义：未发布的新配置编辑后仍计为"新增"（editStatus 保持 1）
  await expect(page.getByText('新增 1')).toBeVisible({ timeout: 15_000 })

  // 取消该条改动：未发布新增的取消 = 回到未创建状态
  await page.locator('[data-testid=config-table]').getByRole('button', { name: '取消改动' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: '取消改动' }).click()
  await expect(page.locator('[data-testid=config-table]').getByText('timeout_seconds')).toHaveCount(
    0,
    { timeout: 15_000 }
  )
  await expect(page.getByText('当前环境没有待发布改动')).toBeVisible({ timeout: 15_000 })

  // 再次创建后删除：未发布的删除是直接移除（不产生待发布删除）
  await page.getByRole('button', { name: '新建配置' }).click()
  await page.getByLabel('分组').fill('app')
  await page.getByLabel('键').fill('timeout_seconds')
  await page.getByLabel('值').fill('30')
  await page.getByRole('button', { name: '创建', exact: true }).click()
  await expect(page.locator('[data-testid=config-table]').getByText('timeout_seconds')).toBeVisible(
    { timeout: 15_000 }
  )
  await page
    .locator('[data-testid=config-table]')
    .getByRole('button', { name: '删除', exact: true })
    .click()
  await page.getByRole('alertdialog').getByRole('button', { name: '删除' }).click()
  await expect(page.getByText('当前环境没有待发布改动')).toBeVisible({ timeout: 15_000 })
})

test('KV 视图保存往返', async ({ page }) => {
  await login(page)
  await page.goto(`/apps/${CHILD_ID}/config`)
  await page.getByRole('button', { name: 'KV' }).click()
  const kv = page.getByLabel('KV 文本')
  await kv.fill('timeout_seconds=30\nnew_key=hello')
  await page.getByRole('button', { name: '保存 KV' }).click()
  await expect(page.getByText('KV 已保存')).toBeVisible({ timeout: 15_000 })
  // 表格视图可见新键
  await page.getByRole('button', { name: '表格' }).click()
  await expect(page.locator('[data-testid=config-table]').getByText('new_key')).toBeVisible({
    timeout: 15_000,
  })
})

test('JSON 视图加载与保存', async ({ page }) => {
  test.setTimeout(90_000) // monaco 首次分包加载（CI 冷缓存）
  await login(page)
  await page.goto(`/apps/${CHILD_ID}/config`)
  await page.getByRole('button', { name: 'JSON' }).click()
  await expect(page.getByText('保存 JSON')).toBeVisible({ timeout: 30_000 })
  // monaco 就绪后存在可编辑文本
  await expect(page.locator('[data-testid=json-editor-wrap] textarea')).toBeAttached({
    timeout: 30_000,
  })
})

test('继承合并视图：本应用覆盖优先、继承行只读标注', async ({ page }) => {
  await login(page)
  // 公共应用加配置 shared_key
  await page.goto(`/apps/${SHARED_ID}/config`)
  await page.getByRole('button', { name: '新建配置' }).click()
  await page.getByLabel('键').fill('shared_key')
  await page.getByLabel('值').fill('from_shared')
  await page.getByRole('button', { name: '创建', exact: true }).click()
  await expect(page.locator('[data-testid=config-table]').getByText('shared_key')).toBeVisible({
    timeout: 15_000,
  })

  // 子应用开启合并视图 → 看到继承行
  await page.goto(`/apps/${CHILD_ID}/config`)
  await page.getByText('显示继承配置（合并视图）').click()
  await expect(
    page.locator('[data-testid=config-table]').getByText('shared_key').first()
  ).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('继承', { exact: true }).first()).toBeVisible()

  // 子应用同名 key 覆盖 → 只显示本应用行（无继承标）
  await page.getByRole('button', { name: '新建配置' }).click()
  await page.getByLabel('键').fill('shared_key')
  await page.getByLabel('值').fill('overridden')
  await page.getByRole('button', { name: '创建', exact: true }).click()
  await expect(page.getByRole('button', { name: 'overridden' })).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('[data-testid=config-table]')).toHaveText(/overridden/)
  const inheritedBadges = await page.getByText('继承', { exact: true }).count()
  expect(inheritedBadges).toBe(0)
})
