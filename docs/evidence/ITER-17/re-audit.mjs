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
for (const [name, url] of [['home', `${BASE}/`], ['settings', `${BASE}/settings`], ['config-kv', `${BASE}/apps/demo_app/config?view=kv`]]) {
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  const r = await page.evaluate(() => {
    const vw = window.innerWidth
    const hits = []
    for (const el of document.querySelectorAll('body *')) {
      const rect = el.getBoundingClientRect()
      if (rect.width > 0 && rect.right > vw + 1) {
        hits.push({ tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 50), right: Math.round(rect.right), text: (el.textContent || '').trim().slice(0, 8) })
      }
    }
    return { vw, hits: hits.slice(0, 3) }
  })
  console.log(name, JSON.stringify(r))
  if (name === 'home') {
    const h = await page.evaluate(() => {
      const header = document.querySelector('header')
      return [...header.querySelectorAll(':scope > *')].map((el) => {
        const rect = el.getBoundingClientRect()
        return { what: (el.getAttribute('aria-label') ?? el.textContent.trim().slice(0, 14)), w: Math.round(rect.width), right: Math.round(rect.right) }
      })
    })
    console.log('header 子元素:', JSON.stringify(h))
  }
}
await browser.close()
