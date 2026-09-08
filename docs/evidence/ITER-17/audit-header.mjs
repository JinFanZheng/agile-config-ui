/**
 * ITER-17：移动端顶栏 DOM 精确审计（390px）——定位被裁元素与顶栏排布。
 */
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
const d = await page.evaluate(() => {
  const vw = window.innerWidth
  const header = document.querySelector('header')
  const out = { vw, headerRect: header.getBoundingClientRect().toJSON(), children: [] }
  for (const el of header.querySelectorAll(':scope > *')) {
    const r = el.getBoundingClientRect()
    out.children.push({
      what: el.getAttribute('aria-label') ?? el.textContent.trim().slice(0, 14) ?? el.tagName,
      tag: el.tagName.toLowerCase(),
      left: Math.round(r.left),
      right: Math.round(r.right),
      w: Math.round(r.width),
      clipped: r.right > vw + 0.5,
    })
  }
  // header 内部所有按钮
  out.buttons = [...header.querySelectorAll('button')].map((b) => {
    const r = b.getBoundingClientRect()
    return { text: (b.textContent || '').trim().slice(0, 10), right: Math.round(r.right), w: Math.round(r.width), clipped: r.right > vw + 0.5 }
  })
  return out
})
console.log(JSON.stringify(d, null, 1))
await browser.close()
