/**
 * ITER-09 设置页主题 chip 几何断言：三色条与主题名文本不相交、透明输入框铺满整个 chip。
 * 用法：node docs/evidence/ITER-09/check-chip-geometry.mjs（dev:5173 + 后端在线；凭证读 .env.e2e）。
 */
import { chromium } from '@playwright/test'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.e2e' })
const BASE = process.env.E2E_BASE_URL || 'http://localhost:5173'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.goto(`${BASE}/login`)
await page.getByLabel('用户名').fill(process.env.E2E_ADMIN_USER || 'admin')
await page.getByLabel('密码').fill(process.env.E2E_ADMIN_PASSWORD)
await page.getByRole('button', { name: '登录' }).click()
await page.waitForURL(/\/$/)
await page.goto(`${BASE}/settings`)
const report = await page.evaluate(() => {
  const group = document.querySelector('[role="radiogroup"][aria-label="主题"]')
  const out = []
  for (const label of group.querySelectorAll('label')) {
    const chip = label.querySelector('span')
    const swatch = chip.querySelector('span')
    const textNode = [...chip.childNodes].find(
      (n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim()
    )
    const range = document.createRange()
    range.setStart(textNode, 0)
    range.setEnd(textNode, textNode.textContent.trim().length)
    const sw = swatch.getBoundingClientRect()
    const tx = range.getBoundingClientRect()
    const input = label.querySelector('input')
    const ir = input.getBoundingClientRect()
    const lr = label.getBoundingClientRect()
    out.push({
      label: textNode.textContent.trim(),
      selected: input.checked,
      gap: Math.round(tx.left - sw.right),
      overlap: !(sw.right <= tx.left),
      inputCoversChip:
        ir.left <= lr.left && ir.right >= lr.right && ir.top <= lr.top && ir.bottom >= lr.bottom,
      inputSize: `${Math.round(ir.width)}x${Math.round(ir.height)}`,
    })
  }
  return out
})
console.table(report)
const bad = report.filter((r) => r.overlap || !r.inputCoversChip)
console.log(
  bad.length
    ? `FAILED: ${JSON.stringify(bad, null, 2)}`
    : 'PASS: 五个主题 chip 色条与文本留有间隙（gap≥4px）、透明输入框完整覆盖 chip 点击面'
)
await browser.close()
process.exit(bad.length ? 1 : 0)
