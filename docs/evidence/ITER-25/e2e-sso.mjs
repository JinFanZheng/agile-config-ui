/**
 * ITER-25 SSO 全链路端到端（真实 Keycloak @ localhost:8081，一次性测试资源）：
 * 登录页按钮（服务端可配文案）→ IdP 登录 → 后端回调 /SSO/Index → /ui#/oidc/login?code=
 * → 本前端 main.tsx 引导兑换 → 登录态进入管理台。
 * 用法：SSO_E2E=1 node docs/evidence/ITER-25/e2e-sso.mjs（前置：keycloak 容器 + backend SSO override）
 */
import { chromium } from '@playwright/test'

const FRONT = 'http://localhost:5173'
const browser = await chromium.launch()
const page = await browser.newPage()
const nav = []
page.on('framenavigated', (f) => f === page.mainFrame() && nav.push(f.url().slice(0, 90)))

// 1. 登录页：SSO 按钮出现且为服务端可配文案
await page.goto(`${FRONT}/login`)
const ssoBtn = page.getByRole('link', { name: '统一身份登录' })
await ssoBtn.waitFor({ timeout: 10_000 })
console.log('✓ 登录页出现 SSO 按钮（服务端可配文案"统一身份登录"）')

// 2. 跳 IdP（Keycloak）并登录测试用户
await ssoBtn.click()
await page.waitForURL(/localhost:8081/, { timeout: 15_000 })
await page.locator('#username').fill('sso_tester')
await page.locator('#password').fill('Sso-Pass-2026')
await page.locator('#kc-login').click()
console.log('✓ Keycloak 登录提交（sso_tester）')

// 3. 回调链：IdP → :5017/SSO/Index?code → /ui#/oidc/login?code= → 5173 兑换 → 登录态
await page.waitForURL((u) => u.origin === FRONT && !u.pathname.startsWith('/login'), { timeout: 20_000 })
await page.waitForTimeout(1200)
const finalUrl = page.url()
const userName = await page.evaluate(() => {
  const raw = localStorage.getItem('agile-config-ui.session')
  return raw ? JSON.parse(raw)?.state?.user?.userName : null
})
console.log('✓ 回到前端并完成兑换，落点:', finalUrl)
console.log('✓ 会话用户名（JWT username claim 解码）:', userName)
await page.screenshot({ path: 'docs/evidence/ITER-25/sso-landed.png' })

// 4. 断言：登录态可用（顶栏用户菜单 / 会话持久）
if (!userName || userName !== 'sso_tester') {
  console.error(`FAIL: 会话用户名期望 sso_tester，实际 ${userName}`)
  process.exit(1)
}
console.log('--- 导航链 ---')
nav.forEach((u, i) => console.log(`  ${i + 1}. ${u}`))
await browser.close()
console.log('SSO 全链路 PASS')
