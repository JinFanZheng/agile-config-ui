/**
 * ITER-16 视觉证据：分组侧栏（管理员全量视角 + 浅色/深色主题各一张）。
 * 用法：node docs/evidence/ITER-16/capture-nav.mjs（dev:5173 在线；凭证读 .env.e2e，不回显）。
 */
import { chromium } from '@playwright/test'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.e2e' })
const BASE = process.env.E2E_BASE_URL || 'http://localhost:5173'
const browser = await chromium.launch()
for (const theme of ['graphite', 'navy-console']) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/login`)
  await page.getByLabel('用户名').fill(process.env.E2E_ADMIN_USER || 'admin')
  await page.getByLabel('密码').fill(process.env.E2E_ADMIN_PASSWORD)
  await page.getByRole('button', { name: '登录' }).click()
  await page.waitForURL(/\/$/)
  await page.evaluate(
    ([k, t]) =>
      localStorage.setItem(
        k,
        JSON.stringify({ state: { theme: t, uiFontSize: 'standard', editorFontSize: 12, motion: true }, version: 0 })
      ),
    ['agile-config-ui.settings', theme]
  )
  await page.goto(`${BASE}/apps`)
  await page.waitForTimeout(300)
  const labels = await page.evaluate(() =>
    [...document.querySelectorAll('aside nav p')].map((el) => el.textContent)
  )
  console.log(`${theme} 分组标签:`, JSON.stringify(labels))
  await page.screenshot({ path: `docs/evidence/ITER-16/nav-grouped-${theme}.png` })
  await ctx.close()
}
await browser.close()
console.log('done')
