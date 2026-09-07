import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

/**
 * ITER-08 交付链路：
 * 1. 应用导出/导入 round-trip（导出文件 → 导入为新应用）
 * 2. 配置 JSON 导出/导入 round-trip
 * 3. 环境间同步（DEV → TEST）
 * 4. 服务注册中心（手动注册 → 列表 → 移除）
 * 自建 e2e_io_* 应用，afterAll 清理。
 */
const ADMIN_USER = process.env.E2E_ADMIN_USER || 'admin'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || ''

test.skip(!ADMIN_PASSWORD, '未配置 E2E_ADMIN_PASSWORD')
test.describe.configure({ mode: 'serial' })

const TS = Date.now().toString(36)
const SRC_APP = `e2e_io_src_${TS}`
const DOWNLOAD_DIR = './test-results/downloads'

async function adminLogin(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('用户名').fill(ADMIN_USER)
  await page.getByLabel('密码').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: '登录' }).click()
  await page.waitForURL(/\/$/)
}

test.beforeAll(async ({ request }) => {
  const { token } = await (await request.post('/admin/jwt/login', {
    data: { userName: ADMIN_USER, password: ADMIN_PASSWORD },
  })).json()
  const auth = { Authorization: `Bearer ${token}` }
  await request.post('/App/Add', {
    headers: auth,
    data: { id: SRC_APP, name: '导出源应用', group: 'e2e', enabled: true, inheritanced: false, inheritancedApps: [] },
  })
  await request.post('/Config/Add?env=DEV', {
    headers: auth,
    data: { appId: SRC_APP, group: 'g', key: 'io_key', value: 'io_value', description: '往返验证' },
  })
})

test.afterAll(async ({ request }) => {
  const { token } = await (await request.post('/admin/jwt/login', {
    data: { userName: ADMIN_USER, password: ADMIN_PASSWORD },
  })).json()
  const auth = { Authorization: `Bearer ${token}` }
  // 清理：源应用 + 导入产生的应用（id 前缀 e2e_io_）
  const apps = (await (await request.get('/App/Search?current=1&pageSize=100', { headers: auth })).json()).data
  for (const a of apps.filter((x: { id: string }) => x.id.startsWith('e2e_io_'))) {
    await request.post(`/App/Delete?id=${a.id}`, { headers: auth })
  }
})

test('应用导出 → 导入 round-trip', async ({ page }) => {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true })
  await adminLogin(page)
  await page.goto('/apps')

  // 导出（触发浏览器下载）
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator(`tr:has-text("${SRC_APP}")`).getByRole('button', { name: '导出' }).click(),
  ])
  const exportPath = path.join(DOWNLOAD_DIR, `app-export-${TS}.json`)
  await download.saveAs(exportPath)
  expect(fs.existsSync(exportPath)).toBe(true)
  const exported = JSON.parse(fs.readFileSync(exportPath, 'utf-8'))
  expect(exported.apps?.length).toBeGreaterThan(0)
  await expect(page.getByText('已导出')).toBeVisible()

  // 先删除源应用（服务端把 AppId 已存在报为校验错误——round-trip = 导出→删除→导入恢复）
  const { token } = await (await page.request.post('/admin/jwt/login', {
    data: { userName: ADMIN_USER, password: ADMIN_PASSWORD },
  })).json()
  await page.request.post(`/App/Delete?id=${SRC_APP}`, { headers: { Authorization: `Bearer ${token}` } })
  await page.goto('/apps')
  await expect(page.locator(`tr:has-text("${SRC_APP}")`)).toHaveCount(0, { timeout: 15_000 })

  // 导入：上传导出文件 → 预览 → 确认
  await page.getByRole('button', { name: '导入应用' }).click()
  await page.setInputFiles('input[type=file]', exportPath)
  await page.getByRole('button', { name: '预览校验' }).click()
  await expect(page.getByText(/将导入 1 个应用/)).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: '确认导入' }).click()
  await expect(page.getByText('应用导入成功')).toBeVisible({ timeout: 15_000 })
  // round-trip 恢复：源应用重新出现在列表
  await expect(page.getByRole('cell', { name: SRC_APP, exact: true })).toBeVisible({ timeout: 15_000 })
})

test('配置 JSON 导入（含层级键与注释）', async ({ page }) => {
  await adminLogin(page)
  // 准备一个 jsonc 文件：层级键 + 注释
  const jsonPath = path.join(DOWNLOAD_DIR, `config-${TS}.json`)
  fs.writeFileSync(jsonPath, '{\n  // 数据库超时\n  "db:timeout": 30,\n  "simple_key": "hello"\n}\n')

  await page.goto(`/apps/${SRC_APP}/config`)
  await page.getByRole('button', { name: '导入 JSON' }).click()
  await page.setInputFiles('input[type=file]', jsonPath)
  await expect(page.getByText(/将新增 2 条配置/)).toBeVisible({ timeout: 10_000 })
  // 预览应显示拆分后的 group:key
  await expect(page.getByText('db:timeout')).toBeVisible()
  await page.getByRole('button', { name: '确认导入' }).click()
  await expect(page.getByText('配置导入成功（待发布）')).toBeVisible({ timeout: 15_000 })
  // 表格可见新键（层级键拆为 g? no—group=db key=timeout）
  await expect(page.locator('[data-testid=config-table]').getByText('timeout')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('[data-testid=config-table]').getByText('simple_key')).toBeVisible()
})

test('环境间同步：DEV → TEST', async ({ page }) => {
  await adminLogin(page)
  await page.goto(`/apps/${SRC_APP}/config`)
  await page.getByRole('button', { name: '同步到其他环境' }).click()
  await page.getByRole('checkbox', { name: 'TEST' }).check()
  await page.getByRole('button', { name: '开始同步' }).click()
  await expect(page.getByText(/已同步到 TEST/)).toBeVisible({ timeout: 15_000 })
  // 切到 TEST 环境验证配置存在
  await page.getByRole('radio', { name: 'TEST' }).click()
  await expect(page.locator('[data-testid=config-table]').getByText('io_key')).toBeVisible({ timeout: 15_000 })
  // 切回 DEV（不影响后续用例）
  await page.getByRole('radio', { name: 'DEV' }).click()
})

test('服务注册中心：手动注册 → 列表 → 移除', async ({ page }) => {
  await adminLogin(page)
  await page.goto('/services')
  await expect(page.getByRole('heading', { name: '服务注册中心' })).toBeVisible()

  const svcName = `e2e_svc_${TS}`
  await page.getByRole('button', { name: '手动注册' }).click()
  await page.getByLabel(/服务ID/).fill(svcName)
  await page.getByLabel(/服务名/).fill('E2E 演示服务')
  await page.getByRole('button', { name: '注册', exact: true }).click()
  await expect(page.locator('tbody').getByText('E2E 演示服务')).toBeVisible({ timeout: 15_000 })

  await page.locator(`tr:has-text("${svcName}")`).getByRole('button', { name: '移除' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: '移除' }).click()
  await expect(page.locator('tbody').getByText('E2E 演示服务')).toHaveCount(0, { timeout: 15_000 })
})
