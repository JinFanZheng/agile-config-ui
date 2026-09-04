// ITER-02 T-09：选中态对比度审计（5 主题）
// Oracle：① 选中底色 vs 页面底色 ≥ 1.10（graphite 实心墨底远超）；② 选中文字 vs 选中底 ≥ 4.5（WCAG AA 正文）
// 运行前置：dev server 已起；凭证经 E2E_ADMIN_USER / E2E_ADMIN_PASSWORD
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'

const THEMES = ['graphite', 'clear-blue', 'warm-paper', 'navy-console', 'fresh-mint']
const OUT = 'docs/evidence/ITER-02'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, baseURL: 'http://localhost:5173' })

await page.goto('/login')
await page.getByLabel('用户名').fill(process.env.E2E_ADMIN_USER || 'admin')
await page.getByLabel('密码').fill(process.env.E2E_ADMIN_PASSWORD || '')
await page.getByRole('button', { name: '登录' }).click()
await page.waitForURL(/\/$/)

const lines = [`# ITER-02 选中态对比度审计 · ${new Date().toISOString()}`]
let failed = 0

for (const t of THEMES) {
  await page.evaluate((theme) => {
    document.documentElement.dataset.theme = theme
  }, t)
  await page.waitForTimeout(300) // 等 transition-colors 稳定

  const r = await page.evaluate(() => {
    const lum = (rgb) => {
      const [r, g, b] = rgb
        .match(/\d+/g)
        .slice(0, 3)
        .map(Number)
        .map((v) => {
          v /= 255
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
        })
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    const ratio = (a, b) => {
      const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x)
      return +((l1 + 0.05) / (l2 + 0.05)).toFixed(2)
    }
    // 透明背景沿祖先链取第一个不透明色
    const effectiveBg = (el) => {
      let n = el
      while (n && n !== document.documentElement) {
        const bg = getComputedStyle(n).backgroundColor
        if (bg && !bg.includes('0, 0, 0, 0') && bg !== 'transparent') return bg
        n = n.parentElement
      }
      return getComputedStyle(document.body).backgroundColor
    }
    const navActive = document.querySelector('aside nav a')
    const envActive = document.querySelector('[role=radiogroup] button[aria-checked=true]')
    const pageBg = getComputedStyle(document.body).backgroundColor
    const row = (name, el) => {
      const cs = getComputedStyle(el)
      return {
        [`${name} 选中底`]: cs.backgroundColor,
        [`${name} 选中字`]: cs.color,
        [`${name} 底vs页面`]: ratio(cs.backgroundColor, pageBg),
        [`${name} 字vs选中底`]: ratio(cs.color, cs.backgroundColor),
      }
    }
    return { ...row('侧栏', navActive), ...row('环境钮', envActive) }
  })

  const checks = [
    ['侧栏 底vs页面', r['侧栏 底vs页面'], 1.1],
    ['侧栏 字vs选中底', r['侧栏 字vs选中底'], 4.5],
    ['环境钮 底vs页面', r['环境钮 底vs页面'], 1.1],
    ['环境钮 字vs选中底', r['环境钮 字vs选中底'], 4.5],
  ]
  const ok = checks.every(([, v, min]) => v >= min)
  if (!ok) failed++
  lines.push(`${ok ? 'PASS' : 'FAIL'}  ${t}`)
  for (const [name, v, min] of checks) lines.push(`      ${name}: ${v}（阈值 ≥${min}）`)
  await page.screenshot({ path: `${OUT}/selected-${t}.png`, clip: { x: 0, y: 0, width: 420, height: 400 } })
}

await browser.close()
lines.push(failed === 0 ? '结果：5/5 PASS' : `结果：${failed} FAIL`)
writeFileSync(`${OUT}/selected-audit.txt`, lines.join('\n') + '\n')
console.log(lines.join('\n'))
process.exit(failed === 0 ? 0 : 1)
