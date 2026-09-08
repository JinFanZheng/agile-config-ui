/** ITER-22 取证：设置页新增两行（默认视图/自动换行）+ JSON 视图换行开启 */
import { chromium } from '@playwright/test'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.e2e' })
const BASE = process.env.E2E_BASE_URL || 'http://localhost:5173'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await page.goto(`${BASE}/login`)
await page.getByLabel('用户名').fill(process.env.E2E_ADMIN_USER || 'admin')
await page.getByLabel('密码').fill(process.env.E2E_ADMIN_PASSWORD || 'demo-stack-2026')
await page.getByRole('button', { name: '登录' }).click()
await page.waitForURL(/\/$/)
await page.goto(`${BASE}/settings`)
await page.waitForTimeout(300)
const rows = await page.evaluate(() =>
  [...document.querySelectorAll('[role="radiogroup"]')].map((g) => g.getAttribute('aria-label'))
)
console.log('设置页 radiogroup:', JSON.stringify(rows))
await page.screenshot({ path: 'docs/evidence/ITER-22/settings-batch3.png', fullPage: true })
await browser.close()
