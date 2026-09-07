# ITER-14 证据 — 设置页主题区重排 + 跟随系统深浅映射可配置

基线：@84cf2f1（typecheck/lint ✓，vitest 115，e2e 36）。收口后：typecheck ✓ / lint ✓ / vitest **117**（+2 映射单测）/ e2e **37**（+1 自定义映射）/ build ✓。

## G1 布局

- 截图：`settings-theme-gallery.png`（graphite：跟随系统块 + 浅/深两组各 5 张色卡网格，5 列对齐）、`settings-system-expanded.png`（跟随系统选中展开：深色时使用/浅色时使用两个下拉，深色上下文）。
- 结构：主题区从"左标题右控件"的 SettingRow 改为全宽区块；色卡=三色条+名称（透明 radio 铺满整卡）；仍为单一 radiogroup（方向键跨组），映射下拉为独立 combobox。

## G2 可配置映射

- store：`systemDark`/`systemLight`（默认 navy-console/graphite，merge 校验非法回退默认）；system 档下修改映射即时重解析生效，非 system 档仅持久化；`resolveThemeSetting` 参数化（themes.ts）。
- boot 脚本：读用户映射解析铺底；e2e 断言改"深色时使用=曜石"后刷新 `data-theme=obsidian` 且 html 内联底 `rgb(0,0,0)`；系统切浅色按映射实时切晨雾蓝。
- 单测（+2）：resolve 自定义映射（含不影响具体主题档）；system 档改映射即时重解析+持久化、非 system 档不动当前主题、非法持久化回退默认映射。

## 复现

`node capture-layout.mjs`（需 dev:5173 与后端在线）。
