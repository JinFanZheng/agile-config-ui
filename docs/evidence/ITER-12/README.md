# ITER-12 证据 — 盲盒皮肤（5 套新主题）

基线：@54fbf91（typecheck/lint ✓，vitest 103，e2e 29）。收口后：typecheck ✓ / lint ✓ / vitest **110**（+7 注册表完整性）/ e2e **34**（+5 盲盒切换）/ build ✓。

## 盲盒内容（G1）

曜石（OLED 纯黑/白强调）、紫夜（深紫罗兰）、樱粉（浅玫瑰/品红强调）、摩卡（暖棕/奶油金强调）、森夜（深绿/月光银强调）。与既有 5 套合计十套（5 浅 + 5 深）。切换全链路（顶栏切换器 / /settings 十选一 / persist / 防闪屏 BG 表 / monaco 深浅）注册表驱动。

## 确定性验证（G2/G4）

- `check-contrast.mjs`（可复现，**PASS**）：解析三处事实源（index.css 令牌块 / index.html BG 表 / themes.ts 色样）——
  - WCAG 对比：正文/次级文/强调文/强调按钮/选中态/语义文本色（info/success/warning/danger）对 page+panel **新 5 套硬卡 4.5 全过**；环境色按实际渲染形态（圆点/色块，WCAG 1.4.11 非文本）全量硬卡 3:1 过（樱粉为此加深 env-dev/test）；
  - 语义色相不变量：success/env-dev ∈ 绿系[70°,180°]、warning/env-test ∈ 橙黄系、danger/env-prod ∈ 红系、info ∈ 蓝系，十主题全过；
  - 防混淆：高饱和强调色与 danger 色相距 ≥20°（樱粉强调因此从玫红 #BE3D77 移到品红 #B52A86；森夜由月光金改银白与摩卡拉开身份）；
  - 交叉一致：css ↔ index.html BG ↔ 色样三处同值；`isDarkTheme` 集合与 css `color-scheme` 一致。
- **基线审计**（既有 5 套已验收外观不改，16 条记录）：graphite success 作文本 3.77；warm-paper/fresh-mint 次级文 3.4–3.9；clear-blue/fresh-mint 强调文 3.5–4.5；两处 warning 对 page 4.4x。可作为后续打磨 backlog。
- 单测 `src/lib/themes.test.ts`（7 例）：注册表无重复、THEMES↔THEME_IDS 一致、色样合法、深浅 5/5、展示名全覆盖、默认浅色、非法值拒绝。

## 深色 monaco（G3）

`JsonView/KvView` 的深浅判定改 `isDarkTheme(theme)`（原硬编码 `=== 'navy-console'`）。实测（`capture-themes.mjs` 内断言）：四套新深色主题 + 樱粉下 monaco 编辑器计算底色 == 各自 `--bg-panel`（如 obsidian `rgb(10,10,12)` ✓）。

## 视觉与 FOUC

- 截图 15 张：5 主题 × （应用列表 / 配置 JSON 视图 / 设置页）；曜石与樱粉另做视觉抽检（十选一色卡、分段控件、徽标渲染正常）。
- `frames/`：4 新深色主题刷新逐帧（CDP screencast，各 5 帧），四角+顶心像素判定**零白帧**（本轮刷新前即为同主题深色页，任何白帧都算闪）。
- e2e `theme.spec.ts`：每套新主题切换 → data-theme/body bg/html 内联底三重断言 + 刷新持久 + 还原默认。

## 复现

`node docs/evidence/ITER-12/check-contrast.mjs`（无需浏览器）；`node docs/evidence/ITER-12/capture-themes.mjs`（需 dev:5173 与后端在线）。
