/**
 * ITER-09/10 视觉证据采集（主会话收口用，一次性脚本，随证据归档保留可复现）。
 * 用法：node docs/evidence/ITER-09/capture-visual-evidence.mjs（需 dev:5173 与后端:5017 在线）。
 * 凭证只从 .env.e2e 读取，不打印、不落盘。
 */
import { chromium } from '@playwright/test'
import dotenv from 'dotenv'
import fs from 'node:fs'

dotenv.config({ path: '.env.e2e' })

const BASE = process.env.E2E_BASE_URL || 'http://localhost:5173'
const USER = process.env.E2E_ADMIN_USER || 'admin'
const PASS = process.env.E2E_ADMIN_PASSWORD
if (!PASS) {
  console.error('缺少 E2E_ADMIN_PASSWORD')
  process.exit(1)
}

const EV9 = 'docs/evidence/ITER-09'
const EV10 = 'docs/evidence/ITER-10'
fs.mkdirSync(`${EV9}/frames`, { recursive: true })
fs.mkdirSync(EV10, { recursive: true })

const SETTINGS_KEY = 'agile-config-ui.settings'
const LEGACY_THEME_KEY = 'agile-config-ui.theme'
const NAVY_SETTINGS = JSON.stringify({
  state: { theme: 'navy-console', uiFontSize: 'standard', editorFontSize: 12, motion: true },
  version: 0,
})

const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  recordVideo: { dir: `${EV9}/video` },
})
const page = await ctx.newPage()

await page.goto(`${BASE}/login`)
await page.getByLabel('用户名').fill(USER)
await page.getByLabel('密码').fill(PASS)
await page.getByRole('button', { name: '登录' }).click()
await page.waitForURL(/\/$/)

// ---------- ITER-09 G1：FOUC 逐帧证据（navy-console 深色，新键 + 老键两种现场） ----------
async function foucRun(label, prepare) {
  await prepare()
  const frames = []
  const cdp = await ctx.newCDPSession(page)
  await cdp.send('Page.enable')
  cdp.on('Page.screencastFrame', (ev) => {
    frames.push({ at: Date.now(), data: ev.data })
    cdp.send('Page.screencastFrameAck', { sessionId: ev.sessionId }).catch(() => {})
  })
  await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 })
  await page.reload({ waitUntil: 'load' })
  await page.waitForTimeout(1200)
  await cdp.send('Page.stopScreencast')
  await cdp.detach()
  frames.forEach((f, j) =>
    fs.writeFileSync(`${EV9}/frames/${label}-frame${String(j).padStart(3, '0')}.png`, Buffer.from(f.data, 'base64'))
  )
  const bg = await page.evaluate(() => document.documentElement.style.backgroundColor)
  console.log(`${label}: ${frames.length} frames, post-load html bg = ${bg}`)
}

await foucRun('newkey-navy-reload1', () =>
  page.evaluate(([k, v]) => localStorage.setItem(k, v), [SETTINGS_KEY, NAVY_SETTINGS])
)
await foucRun('newkey-navy-reload2', () => {})
await foucRun('legacykey-navy-reload', () =>
  page.evaluate(([next, legacy]) => {
    localStorage.removeItem(next)
    localStorage.setItem(legacy, JSON.stringify({ state: { theme: 'navy-console' }, version: 0 }))
  }, [SETTINGS_KEY, LEGACY_THEME_KEY])
)

// ---------- ITER-09 G2：设置页各档位 ----------
await page.evaluate(([k, v]) => localStorage.setItem(k, v), [SETTINGS_KEY, NAVY_SETTINGS])
await page.goto(`${BASE}/settings`)
await page.getByRole('radio', { name: '石墨' }).check()
await page.getByRole('radio', { name: '标准' }).check()
await page.screenshot({ path: `${EV9}/settings-graphite-standard.png` })

await page.getByRole('radio', { name: '紧凑' }).check()
await page.screenshot({ path: `${EV9}/settings-graphite-compact.png` })
await page.getByRole('radio', { name: '大' }).check()
await page.screenshot({ path: `${EV9}/settings-graphite-large.png` })
await page.getByRole('radio', { name: '标准' }).check()

await page.getByRole('radio', { name: '15', exact: true }).check()
await page.screenshot({ path: `${EV9}/settings-editor-font-15.png` })
await page.getByRole('radio', { name: '12', exact: true }).check()

await page.getByRole('switch', { name: '界面动效' }).click()
await page.screenshot({ path: `${EV9}/settings-motion-off.png` })
const attrs = await page.evaluate(() => ({
  theme: document.documentElement.dataset.theme,
  uiFont: document.documentElement.dataset.uiFont,
  motion: document.documentElement.dataset.motion,
}))
console.log('motion-off attrs:', JSON.stringify(attrs))
await page.getByRole('switch', { name: '界面动效' }).click()

await page.getByRole('radio', { name: '深蓝中控' }).check()
await page.screenshot({ path: `${EV9}/settings-navy-console.png` })

// monaco 编辑器字号联动（打开任一应用的 JSON/KV 视图，取 DiffEditor options）
const appLink = page.getByRole('link', { name: 'demo_app' }).first()
if (await appLink.count()) {
  await appLink.click()
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${EV9}/configs-navy-editor-default.png` })
}

// ---------- ITER-10：guide 五节锚点导航 + 主题适配 ----------
await page.goto(`${BASE}/guide`)
for (const [id, name] of [
  ['quick-start', '快速开始'],
  ['csharp-sdk', 'C# SDK 接入'],
  ['service-register', '服务注册与发现'],
  ['pitfalls', '格式与归一化实测坑位'],
  ['faq', 'FAQ'],
]) {
  await page.locator('[data-testid="guide-toc-desktop"]').getByRole('link', { name }).click()
  await page.waitForTimeout(150)
  await page.screenshot({ path: `${EV10}/guide-section-${id}.png` })
}

// 复制按钮内联反馈证据
const block = page.locator('[data-testid="guide-code"]').first()
await block.getByRole('button', { name: '复制' }).click()
await page.screenshot({ path: `${EV10}/guide-copy-feedback.png` })

// ---------- 还原本地偏好（graphite/标准/12/动效开） ----------
await page.evaluate((k) =>
  localStorage.setItem(
    k,
    JSON.stringify({ state: { theme: 'graphite', uiFontSize: 'standard', editorFontSize: 12, motion: true }, version: 0 })
  )
, SETTINGS_KEY)

await ctx.close()
await browser.close()
console.log('done')
