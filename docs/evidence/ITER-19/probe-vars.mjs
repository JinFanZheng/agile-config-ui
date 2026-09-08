import { chromium } from '@playwright/test'
const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto('http://localhost:5173/login')
await page.waitForTimeout(1500)
const vars = await page.evaluate(() => {
  const cs = getComputedStyle(document.documentElement)
  const names = ['--text-secondary', '--text-primary', '--accent-foreground', '--bg-panel', '--border-default', '--bg-elevated']
  return Object.fromEntries(names.map((n) => [n, cs.getPropertyValue(n).trim()]))
})
console.log(JSON.stringify(vars, null, 1))
await browser.close()
