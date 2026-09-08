import { chromium, devices } from '@playwright/test'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.e2e' })
const browser = await chromium.launch()
const page = await browser.newPage({ ...devices['iPhone 12'] })
page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 300)))
page.on('console', (m) => m.type() === 'error' && console.log('CONSOLE:', m.text().slice(0, 300)))
await page.goto('http://localhost:5173/login')
await page.getByLabel('用户名').fill('admin')
await page.getByLabel('密码').fill('demo-stack-2026')
await page.getByRole('button', { name: '登录' }).click()
await page.waitForURL(/\/$/)
await page.goto('http://localhost:5173/apps/demo_app/config?view=kv')
await page.waitForTimeout(6000)
const info = await page.evaluate(() => ({
  url: location.href,
  h1: document.querySelector('h1')?.textContent,
  buttons: [...document.querySelectorAll('button')].map((b) => b.textContent.trim()).slice(0, 14),
  hasErrorText: document.body.textContent.includes('加载失败'),
  kvTextarea: !!document.querySelector('textarea'),
}))
console.log(JSON.stringify(info, null, 1))
await page.screenshot({ path: '/tmp/kv-mobile-nginx.png' })
await browser.close()
