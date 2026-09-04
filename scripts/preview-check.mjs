// ITER-01 T-04：风格静态稿检查
// Oracle：6 个页面 HTTP 可达、1280×800 无横向溢出、无控制台错误；截图落 docs/evidence/ITER-01/
// 运行：先 `python3 -m http.server 5019 --directory design/previews`，再 `node scripts/preview-check.mjs`
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'

const BASE = 'http://localhost:5019'
const PAGES = [
  'index.html',
  'a-clear-blue.html',
  'b-warm-paper.html',
  'c-graphite.html',
  'd-navy-console.html',
  'e-fresh-mint.html',
]
const OUT = 'docs/evidence/ITER-01'

mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
const lines = [`# ITER-01 静态稿检查 · ${new Date().toISOString()} · viewport 1280x800`]
let failed = 0

for (const p of PAGES) {
  const consoleErrors = []
  page.removeAllListeners('console')
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()))
  const resp = await page.goto(`${BASE}/${p}`, { waitUntil: 'networkidle' })
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  )
  const shot = p.replace('.html', '.png')
  await page.screenshot({ path: `${OUT}/${shot}`, fullPage: false })
  const ok = resp.ok() && !overflow && consoleErrors.length === 0
  if (!ok) failed++
  lines.push(
    `${ok ? 'PASS' : 'FAIL'}  ${p}  http=${resp.status()}  横向溢出=${overflow}  控制台错误=${consoleErrors.length}${
      consoleErrors.length ? ' → ' + consoleErrors.join(' | ') : ''
    }  → ${shot}`
  )
}

await browser.close()
lines.push(failed === 0 ? '结果：6/6 PASS' : `结果：${failed} FAIL`)
writeFileSync(`${OUT}/check-report.txt`, lines.join('\n') + '\n')
console.log(lines.join('\n'))
process.exit(failed === 0 ? 0 : 1)
