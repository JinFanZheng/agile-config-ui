import { chromium, devices } from '@playwright/test'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.e2e' })
const BASE = process.env.E2E_BASE_URL || 'http://localhost:5173'
const browser = await chromium.launch()
const page = await browser.newPage({ ...devices['iPhone 12'] })
await page.goto(`${BASE}/login`)
await page.getByLabel('用户名').fill(process.env.E2E_ADMIN_USER || 'admin')
await page.getByLabel('密码').fill(process.env.E2E_ADMIN_PASSWORD)
await page.getByRole('button', { name: '登录' }).click()
await page.waitForURL(/\/$/)
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
await page.waitForTimeout(600)
const trace = await page.evaluate(() => {
  const vw = window.innerWidth
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect()
    if (r.width > 0 && r.right > vw + 1 && el.tagName === 'BUTTON' && /font-mono/.test(el.className)) {
      const chain = []
      let cur = el
      for (let i = 0; i < 6 && cur; i++) {
        const rr = cur.getBoundingClientRect()
        chain.push({
          tag: cur.tagName.toLowerCase(),
          cls: String(cur.className).slice(0, 70),
          visible: getComputedStyle(cur).visibility,
          display: getComputedStyle(cur).display,
          pos: getComputedStyle(cur).position,
          right: Math.round(rr.right),
        })
        cur = cur.parentElement
      }
      return chain
    }
  }
  return null
})
console.log(JSON.stringify(trace, null, 1))
await browser.close()
