# ITER-13 证据 — 主题打磨（基线对比度优化 + 浅/深分组 + 跟随系统）

基线：@444bd2d（typecheck/lint ✓，vitest 110，e2e 34）。收口后：typecheck ✓ / lint ✓ / vitest **115**（+5 system 单测）/ e2e **36**（+2 分组与跟随系统）/ build ✓。

## G1 基线优化（16 项全清零）

令牌调整（只加深、色相不变；色样与 handoff §7.1 已同步）：
- graphite：success `#059669→#047857`（文本 3.77→5.3）
- clear-blue：accent `#2F6BFF→#2456D6`、hover `→#1C46B0`（强调文 4.27→5.9）；warning `#B25E09→#9A5207`（4.43→5.5）
- warm-paper：text-secondary `#8A7F6F→#6F6557`（3.43→5.0）；warning `#A16207→#8F5606`（4.48→5.5）
- fresh-mint：text-secondary `#6B8A80→#4F6F65`；accent `#0D9488→#0F766E`、hover `→#0A5A54`（3.55→5.2）

`../ITER-12/check-contrast.mjs` 已改为**十主题全量硬卡（零豁免）**并 PASS——文本类 ≥4.5、环境色块 ≥3:1（非文本）、语义色相不变量、强调色防混淆、三处事实源交叉一致。

## G2 分组

- 截图：`switcher-menu-grouped.png`（跟随系统 + 浅色组 5 + 深色组 5，role=group）、`settings-theme-grouped.png`（单一 radiogroup 内视觉聚类，方向键跨组可达）。
- e2e `切换器分组`：组结构 5+5、"跟随系统"项可见、**菜单内有且仅有一项 aria-checked=true**（视觉模型曾把跟随系统的显示器图标误读为选中勾，DOM 断言证伪）。

## G3 跟随系统

- 语义：`'system'` 设置哨兵 → 深色 `navy-console` / 浅色 `graphite`；store 派生 `resolvedTheme`（JsonView/KvView 深浅判定、切换器按钮文案消费）；`prefers-color-scheme` change 实时重解析；boot 脚本同规则解析并铺对应底色。
- 单测（+5）：`resolveThemeSetting` 双向映射 / `isThemeSetting` 边界 / setTheme(system) 深浅解析写 dataset / rehydrate 重解析 / matchMedia change 监听实时跟随（含"具体主题档不受系统变化影响"由早退分支保证）。
- e2e `跟随系统`：emulateMedia dark→navy-console、light→graphite 实时翻转、刷新后 boot 铺 `rgb(10,20,36)`。
- 真实浏览器上下文取证：`system-follows-dark.png` / `system-follows-light.png`（colorScheme 由 Playwright 上下文级模拟，非 UI 点击）。

## 调整后观感

`retouched-{graphite,clear-blue,warm-paper,fresh-mint}-apps.png`：加深后的晨雾蓝主按钮/薄荷主按钮/暖纸次级文字观感。

## 复现

`node ../ITER-12/check-contrast.mjs`；`node capture-polish.mjs`（需 dev:5173 与后端在线）。
