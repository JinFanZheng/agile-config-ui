/**
 * ITER-12 视觉证据采集：5 套新主题 × 关键页截图 + monaco 深色底断言 + 新深色主题 FOUC 逐帧。
 * 用法：node docs/evidence/ITER-12/capture-themes.mjs（dev:5173 + 后端在线；凭证读 .env.e2e，不回显）。
 * 页面均为只读查看，不修改任何应用数据。
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

const EV = 'docs/evidence/ITER-12'
fs.mkdirSync(`${EV}/frames`, { recursive: true })

const SETTINGS_KEY = 'agile-config-ui.settings'
const NEW_THEMES = [
  { id: 'obsidian', dark: true, panel: 'rgb(10, 10, 12)' },
  { id: 'violet-night', dark: true, panel: 'rgb(25, 20, 48)' },
  { id: 'sakura', dark: false, panel: 'rgb(255, 255, 255)' },
  { id: 'mocha', dark: true, panel: 'rgb(31, 26, 17)' },
  { id: 'forest', dark: true, panel: 'rgb(18, 32, 25)' },
]

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await ctx.newPage()
await page.goto(`${BASE}/login`)
await page.getByLabel('用户名').fill(process.env.E2E_ADMIN_USER || 'admin')
await page.getByLabel('密码').fill(PASS)
await page.getByRole('button', { name: '登录' }).click()
await page.waitForURL(/\/$/)

// 第一个应用的配置入口（只读查看用）
await page.goto(`${BASE}/apps`)
const configHref = await page.locator('a[href*="/config"]').first().getAttribute('href')

let allPass = true
for (const t of NEW_THEMES) {
  await page.evaluate(
    ([k, id]) =>
      localStorage.setItem(
        k,
        JSON.stringify({ state: { theme: id, uiFontSize: 'standard', editorFontSize: 12, motion: true }, version: 0 })
      ),
    [SETTINGS_KEY, t.id]
  )

  // 1) 应用列表页截图
  await page.goto(`${BASE}/apps`)
  await page.waitForTimeout(250)
  await page.screenshot({ path: `${EV}/${t.id}-apps.png` })

  // 2) 配置 JSON 视图：monaco 底色必须随主题（深色主题 ≠ 白底）
  await page.goto(`${BASE}${configHref}?view=json`)
  await page.waitForSelector('.monaco-editor', { timeout: 15_000 })
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${EV}/${t.id}-configs-json.png` })
  const monoBg = await page.evaluate(() => {
    const el = document.querySelector('.monaco-editor')
    return el ? getComputedStyle(el).backgroundColor : null
  })
  const monoOk = monoBg === t.panel
  if (!monoOk) allPass = false
  console.log(`${t.id}: monaco bg = ${monoBg}（期望 ${t.panel}）${monoOk ? '✓' : '✗'}`)

  // 3) 设置页（主题十选一 + 各档位在新主题下）
  await page.goto(`${BASE}/settings`)
  await page.waitForTimeout(250)
  await page.screenshot({ path: `${EV}/${t.id}-settings.png` })

  // 4) 新深色主题 FOUC 逐帧：刷新一次，导航后首帧不应是白色
  if (t.dark) {
    const frames = []
    const cdp = await ctx.newCDPSession(page)
    await cdp.send('Page.enable')
    cdp.on('Page.screencastFrame', (ev) => {
      frames.push(ev.data)
      cdp.send('Page.screencastFrameAck', { sessionId: ev.sessionId }).catch(() => {})
    })
    await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 })
    await page.reload({ waitUntil: 'load' })
    await page.waitForTimeout(1000)
    await cdp.send('Page.stopScreencast')
    await cdp.detach()
    frames.forEach((d, j) =>
      fs.writeFileSync(`${EV}/frames/${t.id}-frame${String(j).padStart(3, '0')}.png`, Buffer.from(d, 'base64'))
    )
    console.log(`${t.id}: FOUC 采集 ${frames.length} 帧（白闪判定由主会话 ffmpeg 像素检查完成）`)
  }
}

// 还原默认
await page.evaluate(
  (k) =>
    localStorage.setItem(
      k,
      JSON.stringify({ state: { theme: 'graphite', uiFontSize: 'standard', editorFontSize: 12, motion: true }, version: 0 })
    ),
  SETTINGS_KEY
)
await ctx.close()
await browser.close()
console.log(allPass ? 'monaco 断言全部通过' : 'monaco 断言存在失败')
process.exit(allPass ? 0 : 1)
