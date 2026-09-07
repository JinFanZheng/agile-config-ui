import { expect, test } from '@playwright/test'

/**
 * ITER-07 权限体系（安全修复级 negative tests）：
 * 只读角色（仅 APP_READ/CONFIG_READ/LOG_READ）登录后：
 * 1) 无权导航入口不显示（fail-closed）
 * 2) 无权操作按钮全部隐藏
 * 3) 绕过 UI 直调受保护 API → 服务端 403（真正防线）
 * 用例自建角色/用户并在 afterAll 清理。
 */
const ADMIN_USER = process.env.E2E_ADMIN_USER || 'admin'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || ''
const TS = Date.now().toString(36)
const READER = `e2e_reader_${TS}`
const READER_PWD = 'e2ePass123'
const ROLE_ID = crypto.randomUUID()

async function adminLogin(request: import('@playwright/test').APIRequestContext) {
  const res = await request.post('/admin/jwt/login', {
    data: { userName: ADMIN_USER, password: ADMIN_PASSWORD },
  })
  return (await res.json()).token as string
}

test.beforeAll(async ({ request }) => {
  const token = await adminLogin(request)
  const auth = { Authorization: `Bearer ${token}` }
  const role = await request.post('/Role/Add', {
    headers: auth,
    data: {
      id: ROLE_ID,
      name: `e2e只读_${TS}`,
      description: 'E2E 只读角色',
      functions: ['APP_READ', 'CONFIG_READ', 'LOG_READ'],
    },
  })
  expect((await role.json()).success).toBe(true)
  const user = await request.post('/User/Add', {
    headers: auth,
    data: { userName: READER, password: READER_PWD, team: 'e2e', userRoleIds: [ROLE_ID] },
  })
  expect((await user.json()).success).toBe(true)
})

test.afterAll(async ({ request }) => {
  const token = await adminLogin(request)
  const auth = { Authorization: `Bearer ${token}` }
  const users = await request.get('/User/Search?current=1&pageSize=50', { headers: auth })
  const list = (await users.json()).data as { id: string; userName: string }[]
  const uid = list.find((u) => u.userName === READER)?.id
  if (uid) await request.post(`/User/Delete?userId=${uid}`, { headers: auth })
  await request.post(`/Role/Delete?id=${ROLE_ID}`, { headers: auth })
})

test('只读角色：导航与按钮 fail-closed + 直调 API 403', async ({ page, request }) => {
  // 以只读用户登录
  await page.goto('/login')
  await page.getByLabel('用户名').fill(READER)
  await page.getByLabel('密码').fill(READER_PWD)
  await page.getByRole('button', { name: '登录' }).click()
  await page.waitForURL(/\/$/)

  // 1) 侧栏：无权入口不显示，有权入口正常
  const nav = page.getByRole('navigation').first()
  await expect(nav.getByRole('link', { name: '应用' })).toBeVisible()
  await expect(nav.getByRole('link', { name: '系统日志' })).toBeVisible()
  await expect(nav.getByRole('link', { name: '节点' })).toHaveCount(0)
  await expect(nav.getByRole('link', { name: '客户端' })).toHaveCount(0)
  await expect(nav.getByRole('link', { name: '用户' })).toHaveCount(0)
  await expect(nav.getByRole('link', { name: '角色' })).toHaveCount(0)

  // 2) 应用页：新建/编辑/删除/授权全部隐藏，查看类保留
  await page.goto('/apps')
  await expect(page.getByRole('heading', { name: '应用' })).toBeVisible()
  await expect(page.getByRole('button', { name: '新建应用' })).toHaveCount(0)
  const demoRow = page.locator('tr', { hasText: 'demo_app' })
  await expect(demoRow.getByRole('button', { name: '编辑', exact: true })).toHaveCount(0)
  await expect(demoRow.getByRole('button', { name: '删除', exact: true })).toHaveCount(0)
  await expect(demoRow.getByRole('button', { name: '授权' })).toHaveCount(0)

  // 3) 配置页：新建/发布/行操作隐藏，表格可读
  await page.goto('/apps/demo_app/config')
  await expect(page.getByRole('button', { name: '新建配置' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '发布…' })).toHaveCount(0)
  await expect(
    page.locator('[data-testid=config-table]').getByRole('button', { name: '编辑' })
  ).toHaveCount(0)
  await expect(
    page.locator('[data-testid=config-table]').getByRole('button', { name: '删除' })
  ).toHaveCount(0)

  // 4) 真正防线：绕过 UI 直调受保护端点 → 403
  const loginRes = await request.post('/admin/jwt/login', {
    data: { userName: READER, password: READER_PWD },
  })
  const { token: readerToken } = await loginRes.json()
  const attack = await request.post('/App/Add', {
    headers: { Authorization: `Bearer ${readerToken}` },
    data: {
      id: `e2e_attack_${TS}`,
      name: '越权尝试',
      group: '',
      enabled: true,
      inheritanced: false,
      inheritancedApps: [],
    },
  })
  expect(attack.status()).toBe(403)
})
