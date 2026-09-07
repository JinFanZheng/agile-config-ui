/**
 * ITER-12 十主题确定性验证：解析三处事实源（src/index.css / index.html BG 表 /
 * src/lib/themes.ts 色样）做交叉一致性 + WCAG 对比度 + 语义色相不变量断言。
 * 用法：node docs/evidence/ITER-12/check-contrast.mjs（无需浏览器/后端）。
 */
import { readFileSync } from 'node:fs'

const css = readFileSync('src/index.css', 'utf8')
const html = readFileSync('index.html', 'utf8')
const themesTs = readFileSync('src/lib/themes.ts', 'utf8')

// ---------- 解析 ----------
function parseBlock(block) {
  const tokens = {}
  for (const m of block.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6})/g)) tokens[m[1]] = m[2].toLowerCase()
  return tokens
}

const themes = {}
for (const m of css.matchAll(/\[data-theme='([a-z-]+)'\]\s*\{([^}]*)\}/g)) {
  themes[m[1]] = parseBlock(m[2])
}
const rootMatch = css.match(/:root,\s*\[data-theme='graphite'\]\s*\{([^}]*)\}/)
themes['(root)'] = parseBlock(rootMatch[1])

// index.html BG 表
const bgMap = {}
for (const m of html.matchAll(/'?([a-z-]+)'?:\s*'(#[0-9a-fA-F]{6})'/g)) bgMap[m[1]] = m[2].toLowerCase()

// themes.ts 色样 + 深色集合
const swatches = {}
for (const m of themesTs.matchAll(/\{ id: '([a-z-]+)', label: '[^']+', swatch: \[('#[0-9a-fA-F]{6}', '#[0-9a-fA-F]{6}', '#[0-9a-fA-F]{6}')\] \}/g)) {
  swatches[m[1]] = m[2].match(/#[0-9a-fA-F]{6}/g).map((c) => c.toLowerCase())
}
const darkSetMatch = themesTs.match(/DARK_THEMES[^[]*\[([^\]]+)\]/)
const darkDeclared = [...darkSetMatch[1].matchAll(/'([a-z-]+)'/g)].map((m) => m[1])

// ---------- 色彩数学 ----------
function lum(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) =>
    v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  )
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
function contrast(a, b) {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}
function hsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  let h = 0
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return { h, s: s * 100, l: l * 100 }
}
function hueDist(a, b) {
  const d = Math.abs(hsl(a).h - hsl(b).h)
  return Math.min(d, 360 - d)
}

// ---------- 断言 ----------
const failures = []
const notes = []
const ids = ['graphite', 'clear-blue', 'warm-paper', 'navy-console', 'fresh-mint', 'obsidian', 'violet-night', 'sakura', 'mocha', 'forest']

if (JSON.stringify(themes['(root)']) !== JSON.stringify(themes['graphite'])) {
  failures.push('graphite 块与 :root 令牌不一致')
}

for (const id of ids) {
  const t = themes[id]
  if (!t) {
    failures.push(`${id}: index.css 缺少令牌块`)
    continue
  }
  // ITER-13 起：基线优化完成，十主题全量硬卡（无豁免）
  const hard = (fg, bg, min, what) => {
    const c = contrast(t[fg], t[bg])
    if (c < min) failures.push(`${id}: ${what} ${t[fg]} on ${t[bg]} = ${c.toFixed(2)} < ${min}`)
    else if (c < 7) notes.push(`${id}: ${what} = ${c.toFixed(2)}（≥AA，低于 7）`)
  }
  // 文本对比度（WCAG AA 4.5；正文目标 7）
  for (const bg of ['bg-page', 'bg-panel', 'bg-elevated', 'bg-input']) hard('text-primary', bg, 4.5, `正文/${bg}`)
  for (const bg of ['bg-page', 'bg-panel', 'bg-elevated']) hard('text-secondary', bg, 4.5, `次级文/${bg}`)
  for (const bg of ['bg-page', 'bg-panel']) hard('accent', bg, 4.5, `强调文/${bg}`)
  hard('accent-foreground', 'accent', 4.5, '强调按钮文字')
  hard('text-selected', 'bg-selected', 4.5, '选中态文字')
  for (const sem of ['info', 'success', 'warning', 'danger']) {
    for (const bg of ['bg-page', 'bg-panel']) hard(sem, bg, 4.5, `语义 ${sem}/${bg}`)
  }
  // 环境色实为圆点/色块（非文本，EnvSwitcher 等）：WCAG 1.4.11 非文本对比 ≥3，十主题全量硬卡
  for (const sem of ['env-dev', 'env-test', 'env-prod']) {
    for (const bg of ['bg-page', 'bg-panel']) hard(sem, bg, 3.0, `环境色块 ${sem}/${bg}`)
  }
  // 语义色相不变量（handoff §7.1：DEV 绿/TEST 橙/PROD 红；success/warning/danger/info 同族）
  const band = (c, lo, hi, what) => {
    const h = hsl(t[c]).h
    const ok = hi >= lo ? h >= lo && h <= hi : h >= lo || h <= hi
    if (!ok) failures.push(`${id}: ${what} 色相 ${h.toFixed(0)}° 越界 [${lo},${hi}]（${t[c]}）`)
  }
  band('success', 70, 180, 'success 需绿系')
  band('env-dev', 70, 180, 'env-dev 需绿系')
  band('warning', 20, 65, 'warning 需橙黄系')
  band('env-test', 20, 65, 'env-test 需橙黄系')
  band('danger', 335, 15, 'danger 需红系')
  band('env-prod', 335, 15, 'env-prod 需红系')
  band('info', 185, 255, 'info 需蓝系')
  // 强调色与 danger 防混淆（高饱和强调色须与危险红拉开 ≥20° 色相）
  const a = hsl(t['accent'])
  if (a.s >= 15 && hueDist(t['accent'], t['danger']) < 20) {
    failures.push(`${id}: 强调色与 danger 色相距 ${hueDist(t['accent'], t['danger']).toFixed(0)}° < 20°（${t['accent']} vs ${t['danger']}）`)
  }
  // 三处事实源交叉一致：css ↔ index.html BG ↔ 色样
  if (bgMap[id] !== t['bg-page']) failures.push(`${id}: index.html BG=${bgMap[id]} ≠ css bg-page=${t['bg-page']}`)
  const sw = swatches[id]
  if (!sw) failures.push(`${id}: themes.ts 缺色样`)
  else {
    if (sw[0] !== t['accent']) failures.push(`${id}: 色样[0]=${sw[0]} ≠ accent=${t['accent']}`)
    if (sw[1] !== t['bg-page']) failures.push(`${id}: 色样[1]=${sw[1]} ≠ bg-page=${t['bg-page']}`)
    if (sw[2] !== t['border-default']) failures.push(`${id}: 色样[2]=${sw[2]} ≠ border-default=${t['border-default']}`)
  }
  // 深色集合与 color-scheme 一致
  const schemeDark = /color-scheme:\s*dark/.test(css.match(new RegExp(`\\[data-theme='${id}'\\]\\s*\\{[^}]*\\}`))[0])
  if (schemeDark !== darkDeclared.includes(id)) {
    failures.push(`${id}: isDarkTheme=${darkDeclared.includes(id)} 与 css color-scheme=${schemeDark} 不一致`)
  }
}
if (Object.keys(bgMap).length !== ids.length) failures.push(`index.html BG 表条目数 ${Object.keys(bgMap).length} ≠ ${ids.length}`)

// ---------- 输出 ----------
console.log(`检查主题数：${ids.length}`)
if (notes.length) console.log(`备注 ${notes.length} 条（AA 通过、低于 7）：\n  ${notes.join('\n  ')}`)
if (failures.length) {
  console.error(`FAILED ${failures.length} 项：\n  ${failures.join('\n  ')}`)
  process.exit(1)
}
console.log('PASS：对比度（AA）/ 语义色相不变量 / 强调色防混淆 / 三处事实源交叉一致 全部通过')
