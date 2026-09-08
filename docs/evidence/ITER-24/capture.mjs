/** ITER-24 取证：侧栏两种形态 + 设置页新增行 + 指南全宽 */
import { chromium } from '@playwright/test'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.e2e' })
const BASE = process.env.E2E_BASE_URL || 'http://localhost:5173'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 860 } })
await page.goto(`${BASE}/login`)
await page.getByLabel('用户名').fill(process.env.E2E_ADMIN_USER || 'admin')
await page.getByLabel('密码').fill(process.env.E2E_ADMIN_PASSWORD || 'demo-stack-2026')
await page.getByRole('button', { name: '登录' }).click()
await page.waitForURL(/\/(apps)?$/)

await page.goto(`${BASE}/apps`)
await page.waitForTimeout(300)
await page.screenshot({ path: 'docs/evidence/ITER-24/sidebar-expanded.png' })
await page.getByRole('button', { name: '收起侧栏' }).click()
await page.waitForTimeout(200)
await page.screenshot({ path: 'docs/evidence/ITER-24/sidebar-collapsed.png' })
const w = await page.evaluate(() => Math.round(document.querySelector('aside').getBoundingClientRect().width))
console.log('折叠宽:', w)
await page.getByRole('button', { name: '展开侧栏' }).click()

await page.goto(`${BASE}/settings`)
await page.waitForTimeout(300)
const rows = await page.evaluate(() => [...document.querySelectorAll('[role="radiogroup"]')].map((g) => g.getAttribute('aria-label')))
console.log('设置页 radiogroup:', JSON.stringify(rows))
await page.screenshot({ path: 'docs/evidence/ITER-24/settings-rows.png', fullPage: true })

await page.goto(`${BASE}/guide`)
await page.waitForTimeout(300)
await page.screenshot({ path: 'docs/evidence/ITER-24/guide-fullwidth.png' })
await browser.close()
console.log('done')
