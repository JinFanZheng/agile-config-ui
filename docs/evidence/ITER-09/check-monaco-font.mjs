/**
 * ITER-09 编辑器字号联动断言：设置 15 → demo_app（只读查看）JSON/KV 视图 monaco 计算字号 = 15px；
 * 还原 12。只读巡检，不修改 demo_app 任何数据。用法：node check-monaco-font.mjs（dev:5173 在线）。
 */
import { chromium } from '@playwright/test'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.e2e' })
const BASE = process.env.E2E_BASE_URL || 'http://localhost:5173'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.goto(`${BASE}/login`)
await page.getByLabel('用户名').fill(process.env.E2E_ADMIN_USER || 'admin')
await page.getByLabel('密码').fill(process.env.E2E_ADMIN_PASSWORD)
await page.getByRole('button', { name: '登录' }).click()
await page.waitForURL(/\/$/)

await page.goto(`${BASE}/settings`)
await page.getByRole('radio', { name: '15', exact: true }).check()
await page.waitForTimeout(200)
await page.goto(`${BASE}/apps`)
const href = await page.locator(`a[href*="/config"]`).first().getAttribute("href")
await page.goto(`${BASE}${href}?view=json`)
await page.waitForSelector('.monaco-editor', { timeout: 10_000 })
await page.waitForTimeout(800)
const fs15 = await page.evaluate(() => {
  const ta = document.querySelector('.monaco-editor textarea.inputarea')
  return ta ? getComputedStyle(ta).fontSize : null
})
console.log('editorFontSize=15 时 monaco textarea 字号:', fs15)

await page.goto(`${BASE}/settings`)
await page.getByRole('radio', { name: '12', exact: true }).check()
await page.waitForTimeout(200)
await page.goto(`${BASE}/apps`)
const href2 = await page.locator(`a[href*="/config"]`).first().getAttribute("href")
await page.goto(`${BASE}${href2}?view=json`)
await page.waitForSelector('.monaco-editor', { timeout: 10_000 })
await page.waitForTimeout(800)
const fs12 = await page.evaluate(() => {
  const ta = document.querySelector('.monaco-editor textarea.inputarea')
  return ta ? getComputedStyle(ta).fontSize : null
})
console.log('editorFontSize=12 时 monaco textarea 字号:', fs12)
const pass = fs15 === '15px' && fs12 === '12px'
console.log(pass ? 'PASS: monaco Editor 字号随设置即时联动' : 'FAIL')
await browser.close()
process.exit(pass ? 0 : 1)
