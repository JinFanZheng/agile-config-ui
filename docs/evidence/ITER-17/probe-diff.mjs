import { chromium, devices } from '@playwright/test'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.e2e' })
const BASE = process.env.E2E_BASE_URL || 'http://localhost:5173'
const browser = await chromium.launch()
for (const [label, ctxOpts] of [['mobile', { ...devices['iPhone 12'] }], ['desktop', { viewport: { width: 1280, height: 800 } }]]) {
  const ctx = await browser.newContext(ctxOpts)
  const page = await ctx.newPage()
  await page.goto(`${BASE}/login`)
  await page.getByLabel('用户名').fill(process.env.E2E_ADMIN_USER || 'admin')
  await page.getByLabel('密码').fill(process.env.E2E_ADMIN_PASSWORD)
  await page.getByRole('button', { name: '登录' }).click()
  await page.waitForURL(/\/$/)
  await page.goto(`${BASE}/apps/demo_app/config?view=kv`)
  await page.getByRole('button', { name: '对比已保存' }).click()
  await page.waitForSelector('.view-lines', { timeout: 15000 })
  await page.waitForTimeout(800)
  const info = await page.evaluate(() => {
    const root = document.querySelector('.monaco-diff-editor, .diff-editor')
    if (!root) return { root: false }
    const editors = [...root.querySelectorAll(':scope .monaco-editor')].map((e) => Math.round(e.getBoundingClientRect().width))
    const viewLines = [...root.querySelectorAll(':scope .view-lines')].map((e) => {
      const r = e.getBoundingClientRect()
      const cs = getComputedStyle(e)
      return { left: Math.round(r.left), w: Math.round(r.width), display: cs.display, visibility: cs.visibility }
    })
    return { root: true, mqNarrow: window.matchMedia('(max-width: 767px)').matches, editorWidths: editors, viewLines }
  })
  console.log(label, JSON.stringify(info))
  if (label === 'mobile') await page.screenshot({ path: 'docs/evidence/ITER-17/kv-diff-mobile.png' })
  await ctx.close()
}
await browser.close()
