import { expect, test } from '@playwright/test'

/**
 * ITER-21 路由错误页回归：拦截懒加载 chunk（模拟新构建上线后旧标签页拉旧 hash 404），
 * 应显示中文错误页并自动整页刷新一次（防循环），绝不露出 React Router 英文默认页。
 * 凭证见 .env.e2e；demo_app 只读。
 */
const ADMIN_USER = process.env.E2E_ADMIN_USER || 'admin'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || ''

test.skip(!ADMIN_PASSWORD, '未配置 E2E_ADMIN_PASSWORD')

test('chunk 加载失败：中文错误页 + 自动刷新一次且不循环', async ({ page }) => {
  await page.route(/KvView/, (route) => route.abort())

  await page.goto('/login')
  await page.getByLabel('用户名').fill(ADMIN_USER)
  await page.getByLabel('密码').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: '登录' }).click()
  await page.waitForURL(/\/$/)
  // 只清一次防循环标记（不能用 addInitScript：它每次导航都会执行，会把 reload 后的标记也清掉成死循环）
  await page.evaluate(() => sessionStorage.removeItem('agile-config-ui.chunk-reloaded-at'))

  await page.goto('/apps/demo_app/config?view=kv')
  // 中文错误页（应用已更新），而非英文默认页
  await expect(page.getByText('应用已更新')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('button', { name: '刷新加载新版本' })).toBeVisible()
  await expect(page.getByText('Unexpected Application Error')).toHaveCount(0)
  // 自动刷新恰好一次（刷新后 chunk 仍被拦截 → 防循环生效，页面稳定停在错误页）
  await page.waitForTimeout(2500)
  await expect(page.getByText('应用已更新')).toBeVisible()
})
