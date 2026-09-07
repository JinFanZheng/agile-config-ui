/**
 * ITER-14 视觉证据：设置页主题区新布局（色卡网格 + 跟随系统块展开态/映射选择）。
 * 用法：node docs/evidence/ITER-14/capture-layout.mjs（dev:5173 在线；凭证读 .env.e2e，不回显）。
 */
import { chromium } from '@playwright/test'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.e2e' })
const BASE = process.env.E2E_BASE_URL || 'http://localhost:5173'
const EV = 'docs/evidence/ITER-14'
const browser = await chromium.launch()

// A. 默认态（graphite，未选跟随系统）：色卡网格
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/login`)
  await page.getByLabel('用户名').fill(process.env.E2E_ADMIN_USER || 'admin')
  await page.getByLabel('密码').fill(process.env.E2E_ADMIN_PASSWORD)
  await page.getByRole('button', { name: '登录' }).click()
  await page.waitForURL(/\/$/)
  await page.evaluate(() =>
    localStorage.setItem('agile-config-ui.settings', JSON.stringify({ state: { theme: 'graphite', uiFontSize: 'standard', editorFontSize: 12, motion: true }, version: 0 }))
  )
  await page.goto(`${BASE}/settings`)
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${EV}/settings-theme-gallery.png` })
  await ctx.close()
}

// B. 跟随系统选中（系统深色模拟）：块展开 + 两个映射 select，生效主题=深蓝中控
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark' })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/login`)
  await page.getByLabel('用户名').fill(process.env.E2E_ADMIN_USER || 'admin')
  await page.getByLabel('密码').fill(process.env.E2E_ADMIN_PASSWORD)
  await page.getByRole('button', { name: '登录' }).click()
  await page.waitForURL(/\/$/)
  await page.goto(`${BASE}/settings`)
  await page.getByRole('radio', { name: /跟随系统/ }).check()
  await page.waitForTimeout(300)
  const applied = await page.evaluate(() => document.documentElement.dataset.theme)
  await page.screenshot({ path: `${EV}/settings-system-expanded.png` })
  console.log('system @ dark applied:', applied)
  await ctx.close()
}
await browser.close()
console.log('done')
