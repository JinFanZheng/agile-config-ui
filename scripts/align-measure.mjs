// ITER-02 验收反馈取证：对齐问题测量（高度/偏移/圆角一致性）
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'

const OUT = 'docs/evidence/ITER-02'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 2,
  baseURL: 'http://localhost:5173',
})

await page.goto('/login')
await page.getByLabel('用户名').fill(process.env.E2E_ADMIN_USER || 'admin')
await page.getByLabel('密码').fill(process.env.E2E_ADMIN_PASSWORD || '')
await page.getByRole('button', { name: '登录' }).click()
await page.waitForURL(/\/$/)

const report = await page.evaluate(() => {
  const r = []
  const box = (el) => {
    const b = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return {
      h: +b.height.toFixed(1),
      top: +b.top.toFixed(1),
      bottom: +b.bottom.toFixed(1),
      radius: cs.borderRadius,
      fontSize: cs.fontSize,
    }
  }
  const header = document.querySelector('header')
  r.push({ where: 'topbar-children', headerH: +header.getBoundingClientRect().height })
  for (const el of header.children) {
    r.push({
      child: (el.className || el.tagName).split(' ').slice(0, 2).join('.').slice(0, 40),
      ...box(el),
    })
  }
  // 顶栏内所有按钮/切换器高度差
  const btns = [...header.querySelectorAll('button')].map((b) => +b.getBoundingClientRect().height.toFixed(1))
  r.push({ where: 'topbar-button-heights', heights: [...new Set(btns)] })

  // 侧栏导航项
  const nav = [...document.querySelectorAll('aside nav a')].slice(0, 2).map((a) => box(a))
  r.push({ where: 'sidebar-items', items: nav })

  // 概览卡片三张的顶/底对齐
  const cards = [...document.querySelectorAll('main .grid > div')].map((c) => box(c))
  r.push({ where: 'home-cards', cards })

  // 卡片标题基线（CardTitle 与内容首行）
  const titles = [...document.querySelectorAll('main .grid > div > div:first-child')].map((c) => box(c))
  r.push({ where: 'home-card-headers', titles })

  // 顶栏图标与文字的行内对齐（ThemeSwitcher/UserMenu/EnvSwitcher 内部）
  for (const sel of ['header .relative button', 'header [role="radiogroup"] button:first-child']) {
    const el = document.querySelector(sel)
    if (el) {
      const b = el.getBoundingClientRect()
      const icon = el.querySelector('svg, span')
      const ib = icon?.getBoundingClientRect()
      r.push({
        where: `inline-align ${sel}`,
        textH: +b.height,
        iconCenter: ib ? +((ib.top + ib.bottom) / 2 - b.top).toFixed(1) : null,
        expectCenter: +(b.height / 2).toFixed(1),
      })
    }
  }
  return r
})

console.log(JSON.stringify(report, null, 1))
writeFileSync(`${OUT}/alignment-measure.json`, JSON.stringify(report, null, 2))

// 顶栏特写截图（整页 + 顶栏裁切）
await page.screenshot({ path: `${OUT}/align-home-full.png` })
await page.screenshot({ path: `${OUT}/align-topbar-crop.png`, clip: { x: 0, y: 0, width: 1280, height: 48 } })
await browser.close()
console.log('shots saved')
