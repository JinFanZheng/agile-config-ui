/**
 * ITER-17 H5 适配审计：375×812 触屏视口逐页检测横向溢出与超宽元素，并截图。
 * 用法：node docs/evidence/ITER-17/audit-mobile.mjs（dev:5173 + 后端在线；凭证读 .env.e2e，不回显）。
 * 只读巡检（打开新建应用弹窗即取消，不做任何写操作）。
 */
import { chromium, devices } from '@playwright/test'
import dotenv from 'dotenv'
import fs from 'node:fs'

dotenv.config({ path: '.env.e2e' })
const BASE = process.env.E2E_BASE_URL || 'http://localhost:5173'
const EV = 'docs/evidence/ITER-17'
fs.mkdirSync(`${EV}/shots`, { recursive: true })

const browser = await chromium.launch()
const ctx = await browser.newContext({ ...devices['iPhone 12'] }) // 390×844 触屏
const page = await ctx.newPage()

const report = {}

async function auditRoute(name, url, extra) {
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  const findings = await page.evaluate(() => {
    const vw = window.innerWidth
    const doc = document.documentElement
    const pageOverflow = doc.scrollWidth - vw
    const offenders = []
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect()
      if (r.width > 0 && (r.right > vw + 1 || r.left < -1) && !['HTML', 'BODY'].includes(el.tagName)) {
        offenders.push({
          tag: el.tagName.toLowerCase(),
          cls: String(el.className).slice(0, 60),
          w: Math.round(r.width),
          left: Math.round(r.left),
          right: Math.round(r.right),
        })
      }
    }
    // 去重：只保留最外层超宽者（子元素随父级超宽）
    offenders.sort((a, b) => b.w - a.w)
    const top = offenders.filter((o) => o.w >= offenders[0]?.w * 0.9).slice(0, 5)
    return { vw, pageOverflow, offenderCount: offenders.length, top }
  })
  if (extra) await extra()
  await page.screenshot({ path: `${EV}/shots/${name}.png` })
  report[name] = findings
  const flag = findings.pageOverflow > 1 || findings.offenderCount > 0 ? '⚠️' : '✓'
  console.log(
    `${flag} ${name}: pageOverflow=${findings.pageOverflow}px, 超宽元素=${findings.offenderCount}${findings.top?.length ? ` → ${JSON.stringify(findings.top.slice(0, 2))}` : ''}`
  )
}

// 登录页（未登录态）
await auditRoute('login', `${BASE}/login`)

// 登录
await page.getByLabel('用户名').fill(process.env.E2E_ADMIN_USER || 'admin')
await page.getByLabel('密码').fill(process.env.E2E_ADMIN_PASSWORD)
await page.getByRole('button', { name: '登录' }).click()
await page.waitForURL(/\/$/)

await auditRoute('home', `${BASE}/`)
await auditRoute('apps', `${BASE}/apps`)

// 新建应用弹窗（打开→测量→取消）
await auditRoute('apps-newapp-modal', `${BASE}/apps`, async () => {
  await page.getByRole('button', { name: '新建应用' }).first().click()
  await page.waitForTimeout(300)
  const m = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]')
    if (!dialog) return null
    const r = dialog.getBoundingClientRect()
    return { vw: window.innerWidth, w: Math.round(r.width), left: Math.round(r.left), right: Math.round(r.right) }
  })
  console.log(`   弹窗: ${JSON.stringify(m)}`)
  await page.screenshot({ path: `${EV}/shots/apps-newapp-modal.png` })
  await page.keyboard.press('Escape')
})

await auditRoute('config-table', `${BASE}/apps/demo_app/config`)
await auditRoute('config-kv', `${BASE}/apps/demo_app/config?view=kv`)
await auditRoute('config-json', `${BASE}/apps/demo_app/config?view=json`)
await auditRoute('config-history', `${BASE}/apps/demo_app/config?view=history`)
await auditRoute('app-history', `${BASE}/apps/demo_app/history`)
await auditRoute('history-index', `${BASE}/history`)
await auditRoute('clients', `${BASE}/clients`)
await auditRoute('nodes', `${BASE}/nodes`)
await auditRoute('logs', `${BASE}/logs`)
await auditRoute('users', `${BASE}/users`)
await auditRoute('roles', `${BASE}/roles`)
await auditRoute('services', `${BASE}/services`)
await auditRoute('guide', `${BASE}/guide`)
await auditRoute('settings', `${BASE}/settings`)

// 抽屉菜单
await page.goto(`${BASE}/apps`)
await page.getByRole('button', { name: '打开导航菜单' }).click()
await page.waitForTimeout(300)
const drawer = await page.evaluate(() => ({
  asideVisible: !!document.querySelector('aside.anim-drawer, aside.fixed'),
}))
await page.screenshot({ path: `${EV}/shots/drawer.png` })
console.log(`drawer: ${JSON.stringify(drawer)}`)
await page.keyboard.press('Escape')

fs.writeFileSync(`${EV}/audit-report.json`, JSON.stringify(report, null, 2))
await ctx.close()
await browser.close()
console.log('audit done')
