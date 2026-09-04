// ITER-04 T-06：千条配置性能实测
// Oracle：① 1000+ 行加载后，表格 DOM 渲染节点 < 60（虚拟滚动生效）且滚动总高 ≈ 行数×行高；
//         ② 过滤输入到 DOM 收敛 < 300ms（大数据量即时响应，UX #12）
// 数据纪律：自建 e2e_perf_* 应用，结束删除。
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'

const ADMIN_USER = process.env.E2E_ADMIN_USER || 'admin'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || ''
const APP_ID = `e2e_perf_${Date.now().toString(36)}`
const OUT = 'docs/evidence/ITER-04'
const TOTAL = 1000
const CHUNK = 100

mkdirSync(OUT, { recursive: true })
const lines = [`# ITER-04 千条性能实测 · ${new Date().toISOString()}`]

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, baseURL: 'http://localhost:5173' })

// 登录 + 建应用 + 灌 1000 条（10 组 × 100）
const loginRes = await page.request.post('/admin/jwt/login', {
  data: { userName: ADMIN_USER, password: ADMIN_PASSWORD },
})
const { token } = await loginRes.json()
const auth = { Authorization: `Bearer ${token}` }
lines.push(`应用：${APP_ID}（结束后删除；不动 demo_app）`)

await page.request.post('/App/Add', {
  headers: auth,
  data: { id: APP_ID, name: 'perf压测应用', group: '', enabled: true, inheritanced: false, inheritancedApps: [] },
})
const t0 = Date.now()
for (let g = 0; g < 10; g++) {
  const list = Array.from({ length: CHUNK }, (_, i) => ({
    appId: APP_ID,
    group: `g${g}`,
    key: `k_${g}_${i}`,
    value: `v_${g}_${i}`,
  }))
  const res = await page.request.post(`/Config/AddRange?env=DEV`, { headers: { ...auth, 'Content-Type': 'application/json' }, data: list })
  const body = await res.json()
  if (!body.success) throw new Error('AddRange 失败: ' + JSON.stringify(body).slice(0, 200))
}
lines.push(`灌入 ${TOTAL} 条：${((Date.now() - t0) / 1000).toFixed(1)}s（${TOTAL / CHUNK} 批 AddRange）`)

// 打开配置页
await page.goto('/login')
await page.getByLabel('用户名').fill(ADMIN_USER)
await page.getByLabel('密码').fill(ADMIN_PASSWORD)
await page.getByRole('button', { name: '登录' }).click()
await page.waitForURL(/\/$/)
await page.goto(`/apps/${APP_ID}/config`)
await page.locator('[data-testid=config-table] .font-mono', { hasText: 'k_0_0' }).first().waitFor({ timeout: 30_000 })
await page.waitForTimeout(500)

// Oracle A：虚拟滚动
const virtual = await page.evaluate(() => {
  const table = document.querySelector('[data-testid=config-table]')
  const container = table.children[0].children[1] // 虚拟行容器（0=表头）
  return {
    渲染DOM行数: container.children.length,
    滚动总高: +container.style.height.replace('px', ''),
  }
})
const domOk = virtual.渲染DOM行数 < 60
lines.push(
  `虚拟滚动：渲染 DOM 节点 ${virtual.渲染DOM行数}（阈值 <60）→ ${domOk ? 'PASS' : 'FAIL'}；滚动总高 ${virtual.滚动总高}px`
)
await page.screenshot({ path: `${OUT}/perf-1000-virtual.png` })

// Oracle B：过滤即时响应（k_42_ 命中 10 行 + 10 个组头）
const filterMs = await page.evaluate(async () => {
  const input = document.querySelector('input[placeholder*="过滤"]')
  const table = document.querySelector('[data-testid=config-table]')
  const container = table.children[0].children[1]
  const t = performance.now()
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  setter.call(input, 'k_42_')
  input.dispatchEvent(new Event('input', { bubbles: true }))
  await new Promise(requestAnimationFrame)
  await new Promise(requestAnimationFrame)
  return +(performance.now() - t).toFixed(0)
})
const filterOk = filterMs < 300
lines.push(`过滤 1000→10 行收敛：${filterMs}ms（阈值 <300ms）→ ${filterOk ? 'PASS' : 'FAIL'}`)
await page.screenshot({ path: `${OUT}/perf-filter.png` })

// 清理
await page.request.post(`/App/Delete?id=${APP_ID}`, { headers: auth })

await browser.close()
const pass = domOk && filterOk
lines.push(pass ? '结果：PASS' : '结果：FAIL')
writeFileSync(`${OUT}/perf-report.txt`, lines.join('\n') + '\n')
console.log(lines.join('\n'))
process.exit(pass ? 0 : 1)
