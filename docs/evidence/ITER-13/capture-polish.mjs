/**
 * ITER-13 视觉证据：切换器分组菜单 / 设置页分组 / 跟随系统深浅翻转 / 调整令牌的四主题新观感。
 * 用法：node docs/evidence/ITER-13/capture-polish.mjs（dev:5173 + 后端在线；凭证读 .env.e2e，不回显）。
 */
import { chromium } from '@playwright/test'
import dotenv from 'dotenv'
import fs from 'node:fs'

dotenv.config({ path: '.env.e2e' })
const BASE = process.env.E2E_BASE_URL || 'http://localhost:5173'
const PASS = process.env.E2E_ADMIN_PASSWORD
if (!PASS) {
  console.error('缺少 E2E_ADMIN_PASSWORD')
  process.exit(1)
}
const EV = 'docs/evidence/ITER-13'
fs.mkdirSync(EV, { recursive: true })

const SETTINGS_KEY = 'agile-config-ui.settings'
const setTheme = (page, theme) =>
  page.evaluate(([k, t]) => {
    const raw = JSON.parse(localStorage.getItem(k) ?? '{}')
    raw.state = { ...(raw.state ?? {}), theme: t, uiFontSize: 'standard', editorFontSize: 12, motion: true }
    localStorage.setItem(k, JSON.stringify(raw))
  }, [SETTINGS_KEY, theme])

const browser = await chromium.launch()

// ---- A. 分组菜单 + 设置页分组（graphite 下）----
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/login`)
  await page.getByLabel('用户名').fill(process.env.E2E_ADMIN_USER || 'admin')
  await page.getByLabel('密码').fill(PASS)
  await page.getByRole('button', { name: '登录' }).click()
  await page.waitForURL(/\/$/)

  await page.getByRole('button', { name: '石墨' }).click()
  await page.waitForTimeout(250)
  await page.screenshot({ path: `${EV}/switcher-menu-grouped.png` })

  await page.keyboard.press('Escape')
  await page.goto(`${BASE}/settings`)
  await page.waitForTimeout(250)
  await page.screenshot({ path: `${EV}/settings-theme-grouped.png` })
  await ctx.close()
}

// ---- B. 跟随系统：深/浅两态（emulateMedia）----
for (const scheme of ['dark', 'light']) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: scheme })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/login`)
  await page.getByLabel('用户名').fill(process.env.E2E_ADMIN_USER || 'admin')
  await page.getByLabel('密码').fill(PASS)
  await page.getByRole('button', { name: '登录' }).click()
  await page.waitForURL(/\/$/)
  await setTheme(page, 'system')
  await page.reload()
  await page.waitForTimeout(400)
  const applied = await page.evaluate(() => document.documentElement.dataset.theme)
  await page.screenshot({ path: `${EV}/system-follows-${scheme}.png` })
  console.log(`system @ ${scheme}: data-theme = ${applied}`)
  if (applied !== (scheme === 'dark' ? 'navy-console' : 'graphite')) process.exit(1)
  await ctx.close()
}

// ---- C. 调整过令牌的四主题观感（graphite/clear-blue/warm-paper/fresh-mint 应用列表页）----
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/login`)
  await page.getByLabel('用户名').fill(process.env.E2E_ADMIN_USER || 'admin')
  await page.getByLabel('密码').fill(PASS)
  await page.getByRole('button', { name: '登录' }).click()
  await page.waitForURL(/\/$/)
  for (const id of ['graphite', 'clear-blue', 'warm-paper', 'fresh-mint']) {
    await setTheme(page, id)
    await page.goto(`${BASE}/apps`)
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${EV}/retouched-${id}-apps.png` })
  }
  await setTheme(page, 'graphite')
  await ctx.close()
}

await browser.close()
console.log('done')
