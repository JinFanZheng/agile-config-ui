/**
 * ITER-09 分段单选视觉状态断言：选中档 chip 必须有 selected 底色（peer-checked 生效）、
 * 控件不被卡片右缘裁切。用法：node check-segmented-style.mjs（dev:5173 在线；凭证读 .env.e2e）。
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

const probe = () =>
  page.evaluate(() => {
    const chip = (radio) => radio.parentElement.querySelector('span')
    const read = (group) => {
      const radios = [...document.querySelectorAll(`input[name="${group}"]`)]
      return radios.map((r) => {
        const cs = getComputedStyle(chip(r))
        return { label: chip(r).textContent.trim(), checked: r.checked, bg: cs.backgroundColor, fw: cs.fontWeight }
      })
    }
    return { ui: read('settings-ui-font'), editor: read('settings-editor-font') }
  })

await page.getByRole("radio", { name: "紧凑" }).check()
await page.waitForTimeout(350)
const compact = await probe()
await page.getByRole("radio", { name: "标准" }).check()
await page.waitForTimeout(350)
const standard = await probe()
console.log('紧凑选中时:', JSON.stringify(compact.ui))
console.log('标准选中时:', JSON.stringify(standard.ui))
console.log('编辑器字号(12):', JSON.stringify(standard.editor))

// 右缘裁切检查：界面字号组与其所在设置行的右缘间距
const clip = await page.evaluate(() => {
  const group = document.querySelector('[role="radiogroup"][aria-label="界面字号"]')
  const g = group.getBoundingClientRect()
  // 设置行（px-4）：控件须落在内容盒内，不侵入右内边距（注意 closest 会自匹配，组自身 border-border 含 "border-b" 子串）
  const row = group.closest('div[class*="px-4"]')
  const cs = getComputedStyle(row)
  const contentRight = row.getBoundingClientRect().right - parseFloat(cs.paddingRight)
  return { groupRight: Math.round(g.right), contentRight: Math.round(contentRight), overflow: Math.round(g.right - contentRight) }
})
console.log('右缘间距:', JSON.stringify(clip))

const okSel = (arr, want) => Boolean(arr.find((x) => x.label === want)?.checked)
const selBg = (arr) => [...new Set(arr.filter((x) => x.checked).map((x) => x.bg))][0]
const unBg = (arr) => [...new Set(arr.filter((x) => !x.checked).map((x) => x.bg))][0]
const pass =
  okSel(compact.ui, '紧凑') &&
  okSel(standard.ui, '标准') &&
  selBg(compact.ui) !== unBg(compact.ui) &&
  clip.overflow <= 0.5
console.log(pass ? 'PASS: 选中态底色区分正常、控件未侵入右内边距' : 'FAIL')
await browser.close()
process.exit(pass ? 0 : 1)
