# ITER-09 证据 — 设置中心与防闪屏修复

基线：v1.0.0 @1b568f1（typecheck ✓ / lint ✓ / vitest 88 通过）。收口后：typecheck ✓ / lint ✓ / vitest **103** 通过（+16 设置与迁移单测）/ e2e **29** 通过（+5 设置冒烟）/ build ✓。

## G1 FOUC 修复（逐帧证据）

- `frames/`：CDP `Page.startScreencast` 逐帧截取（1280×800，dev 模式 5173）：
  - `newkey-navy-reload1/2-*.png`：新键 `agile-config-ui.settings`（theme=navy-console）下刷新；
  - `legacykey-navy-reload-*.png`：老键 `agile-config-ui.theme` 现场（新键删除）下刷新。
- 像素判定（ffmpeg 四角+顶部中心采样，RGB 全 ≥240 判白）：**所有导航后首帧即 `#0a1424`（navy-console `--bg-page` 令牌原值）**，无任何白帧；`newkey-navy-reload1-frame000` 的白色为导航发生前石墨页面本底（graphite `--bg-page: #ffffff`，见 `src/index.css`），非闪白。
- `fouc-navy-console-session.webm`：整段录屏（三次深色刷新 + 设置页档位切换）。
- 加载后 DOM 断言（e2e `settings.spec.ts` 用例 5）：`documentElement.style.backgroundColor === 'rgb(10, 20, 36)'`。

## G2 设置页与全站联动

- 截图：`settings-graphite-standard / -compact / -large / -editor-font-15 / -motion-off / -navy-console.png`。
- 几何断言脚本（可复现，均 PASS）：
  - `check-chip-geometry.mjs`：五主题 chip 三色条与文本间隙 8px、无重叠；透明输入框完整覆盖 chip（键盘/点击可达）。
  - `check-segmented-style.mjs`：分段单选选中态实心底色 + 500 字重（`peer-checked` 生效）；控件未侵入行右内边距。
  - `check-monaco-font.mjs`：设置 15/12 后 monaco 编辑区 textarea 计算字号实测 **15px / 12px**（只读查看，未改任何应用数据）。
- e2e（`e2e/settings.spec.ts`，5 用例全绿）：四项控件就位；设置页 ↔ 顶栏切换器双向同步；界面字号/动效即时生效 + 刷新持久；编辑器字号持久化到统一键；老键无感迁移（新键写入、老键删除、深色铺底）。
- 单测（`src/stores/settings.test.ts`，16 例）：迁移纯函数（老键→新键/幂等/非法回退/JSON 损坏）、默认值、setters+dataset、rehydrate、模块级迁移端到端、matchMedia 跟随。

## G3 老键迁移

见上：单测覆盖幂等与回退；e2e 用例 5 造老用户现场验证"刷新即迁移、无感"；`frames/legacykey-*` 提供视觉侧证据。

## 采集/复现

`capture-visual-evidence.mjs` 为截图与逐帧采集脚本（凭证读 `.env.e2e`，不回显）。视觉模型对截图的两处误报（"chip 文字被遮挡""选中态不同步"）已分别被几何断言与计算样式断言推翻，以脚本结论为准。
