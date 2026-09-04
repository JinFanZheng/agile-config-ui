// ITER-02 T-05：5 主题 × (登录页 + 概览页) 截图证据
// 运行前置：dev server 已起（5173）；凭证经环境变量 E2E_ADMIN_USER / E2E_ADMIN_PASSWORD
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'

const THEMES = ['graphite', 'clear-blue', 'warm-paper', 'navy-console', 'fresh-mint']
const OUT = 'docs/evidence/ITER-02'

mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: 1280, height: 800 },
  baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
})
const lines = [`# ITER-02 主题截图 · ${new Date().toISOString()} · viewport 1280x800`]

const setTheme = (t) =>
  page.evaluate((theme) => {
    localStorage.setItem('agile-config-ui.theme', JSON.stringify({ state: { theme }, version: 0 }))
    document.documentElement.dataset.theme = theme
  }, t)

// 登录页 ×5（未认证上下文）
for (const t of THEMES) {
  await page.goto('/login')
  await setTheme(t)
  await page.waitForTimeout(150)
  await page.screenshot({ path: `${OUT}/${t}-login.png` })
  lines.push(`✓ ${t}-login.png`)
}

// 概览页 ×5（登录一次，逐主题切换）
await page.goto('/login')
await setTheme('graphite')
await page.getByLabel('用户名').fill(process.env.E2E_ADMIN_USER || 'admin')
await page.getByLabel('密码').fill(process.env.E2E_ADMIN_PASSWORD || '')
await page.getByRole('button', { name: '登录' }).click()
await page.waitForURL(/\/$/)

for (const t of THEMES) {
  await setTheme(t)
  await page.waitForTimeout(150)
  await page.screenshot({ path: `${OUT}/${t}-home.png` })
  lines.push(`✓ ${t}-home.png`)
}

await browser.close()
writeFileSync(`${OUT}/theme-shots.txt`, lines.join('\n') + '\n')
console.log(lines.join('\n'))
