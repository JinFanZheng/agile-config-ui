# 迭代卡 ITER-02 - 主题系统与通用基建

> 状态：验收中（对齐与选中态反馈均已修复，等待用户复验）
> 变更分类：中改（全站视觉基建，不动业务功能与信息架构）
> 方案出处：ITER-01 用户选型结论（五主题可切、默认石墨、布局定稿）
> 日期：2026-09-04 开始 / 2026-09-04 实现完成；同日验收反馈修复
> Goal 审查：PASS（见 1.3）
> 当前授权边界：允许——改 `src/`（令牌/主题引擎/通用组件/既有页面适配）、新增 e2e 与脚本、提交；禁止——发布、对外通知、改服务端
> 复审触发：令牌契约变化 / 新增主题 / 布局或密度被要求随主题变化（违反 §7.1 契约）

## 1. 目标与范围

- 做什么：把 handoff §7.1 选型落成主题引擎——5 主题 CSS 变量组 + `html[data-theme]` 切换 + 顶栏主题切换器 + 持久化 + 防闪屏；组件去硬编码颜色；M0 页面在 5 主题下全部可用且门禁全绿
- 不做什么：不改布局/信息架构/密度（恒定）；不做主题的运行时自定义（仅预置 5 个）；不做 M1+ 功能
- 影响面：`src/index.css`、`src/stores|lib|components|strings`、`index.html`、e2e
- 完成定义：默认石墨生效；任意主题切换即时生效且刷新保持；防闪屏；全部质量门绿 + 5 主题截图证据；**用户验收通过**

### 1.1 Goal 定义

| Goal | 用户/系统结果 | Baseline / 当前差距 | Closure rule | Owner |
|---|---|---|---|---|
| G0 | 用户可在顶栏一键切换 5 主题之一，即时生效、刷新保持、无闪屏；默认 graphite；全部自动化门绿 | main@c6ffb06 仅单一暗色令牌组，无切换能力；组件存在硬编码色 | e2e 主题用例绿 + 5 主题截图 + typecheck/lint/unit/e2e 全绿 + 用户验收 | Codex |

### 1.2 Goal -> Task -> Gate -> Evidence

| Goal | Tasks | Closure Gates | Evidence |
|---|---|---|---|
| G0 | T-01..T-06 | RG-1 baseline（c6ffb06 门禁绿）；RG-2 全 task GREEN；RG-5 真实浏览器 5 主题可视；RG-8 回退=revert 单提交 | `docs/evidence/ITER-02/` |

### 1.3 Goal 审查

| Review | 日期 | 结论 | 阻断发现 | 处理结果 |
|---|---|---|---|---|
| Initial | 2026-09-04 | PASS | 无 P0/P1 | — |

| Gate | GR-1 | GR-2 | GR-3 | GR-4 | GR-5 | GR-6 | GR-7 | GR-8 | GR-9 | GR-10 |
|---|---|---|---|---|---|---|---|---|---|---|
| 结果 | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |

依据摘要：GR-1 结果=可观察的切换能力而非"写了主题"；GR-2 oracle=e2e 断言 data-theme 与持久化；GR-3 卡↔任务↔证据闭环；GR-4 next task 明确；GR-5 无虚构依赖（组件适配依赖令牌契约先行）；GR-6 无安全面变化（token/凭证逻辑零改动）；GR-7 分层=L0 全量 + e2e(L-Real 浏览器) + 5 主题截图；GR-8 回退=revert，无数据迁移；GR-9 用户验收前不标完成；GR-10 handoff §7.1/§8.7、总表、PROGRESS 同步。

### 1.4 Goal 进度账本

| Goal | 状态 | Baseline / 当前差距 | Closure rule | Evidence | Next ready task | Blocker / Owner |
|---|---|---|---|---|---|---|
| G0 | EVIDENCE_READY | 实现与自动化门全绿（见 §6），仅剩用户验收 | 同 §1.1 | `docs/evidence/ITER-02/` | T-08 用户复验（含选中态修复确认，owner: 用户） | 等待用户复验 / Codex |

## 2. 任务与依赖

| Task | Goal / Goal Delta | Input | Output | Verify / Evidence | Depends on | Owner / 状态 |
|---|---|---|---|---|---|---|
| T-01 | G0 / 令牌契约 + graphite（默认）落地 | §7.1 令牌契约 | `index.css` 重构（:root=graphite，@theme inline 映射含 radius/shadow/input） | build + 视觉自检 | 无 | Codex / DONE |
| T-02 | G0 / 其余 4 主题令牌组 | T-01 契约 | `[data-theme=...]` ×4 | e2e 断言计算样式 | T-01 | Codex / DONE |
| T-03 | G0 / 主题 store + 防闪屏 boot + ThemeSwitcher | T-02 | `stores/theme.ts`、`lib/themes.ts`、`hooks/useDropdown.ts`、`index.html` boot 脚本、顶栏切换器 | unit + e2e(theme.spec) | T-02 | Codex / DONE |
| T-04 | G0 / 组件去硬编码（input 底/弹层阴影/滚动条） | T-01 令牌 | input/UserMenu/AppLayout 适配 | typecheck/lint + 截图 | T-01 | Codex / DONE |
| T-05 | G0 / 全量回归 + 5 主题截图证据 | T-03/T-04 | 门禁输出 + 截图 ×10 | `docs/evidence/ITER-02/` | T-03,T-04 | Codex / DONE |
| T-06 | G0 / 用户验收 | T-05 | 验收结论回填本卡 | 聊天记录 | T-05 | 用户 / 反馈：顶栏不对齐 |
| T-07 | G0 / 对齐修复 | 用户反馈「貌似不是很对齐」+ 测量取证 | EnvSwitcher 重构为单描边分段控件（30→28px 与邻控件同高）；全页面测量审计 | `alignment-measure.json` + 门禁全绿 | T-06 | Codex / DONE |
| T-08 | G0 / 用户复验 | T-07 | 复验结论回填（通过则本卡 VERIFIED） | 聊天记录 | T-07 | 用户 / 反馈：选中态不可见 |
| T-09 | G0 / 选中态令牌与接入 | 用户反馈「选中状态的背景色和字体颜色」+ 取证：亮色主题选中底 vs 页面底仅 1.04–1.08（不可见） | 新增 --bg-hover/--bg-selected/--text-selected ×5 主题（还原各静态稿选中语义：石墨=墨底白字、晨雾蓝=蓝晕深蓝字、暖纸=暖沙墨字、深蓝=青底天青字、薄荷=薄荷底深青字）；接入侧栏/EnvSwitcher/ThemeSwitcher/UserMenu/ghost·outline 按钮；弹层容器改 bg-panel | `selected-audit.txt` 5/5 PASS + 门禁全绿 | T-08 | Codex / DONE |

## 3. 测试与验收计划

| 层 | 场景与 Oracle | 命令 / 资源 | Evidence |
|---|---|---|---|
| L0 | 可编译、零 lint | `pnpm typecheck && pnpm lint && pnpm build` | 门禁输出 |
| L1 | theme store：默认值/持久化/应用 data-theme/非法值回退 | `pnpm test`（4 例） | vitest 输出 |
| L-Real | 默认 graphite；UI 切换即时生效（body 计算样式随主题变）；刷新持久；既有 3 条 e2e 不回归；5 主题 × 登录/概览截图 | `pnpm e2e` + `node scripts/theme-shots.mjs` | e2e 输出 + 截图 |

## 4. Release Gates 与停止条件

| Gate | PASS 条件 | Evidence | 状态 |
|---|---|---|---|
| RG-1 Baseline | main@c6ffb06：typecheck/lint/19 unit/3 e2e 全绿 | 本卡记录（M0 收口时输出） | PASS |
| RG-2 Implementation | T-01..T-05 全 GREEN，无 P0/P1 | 门禁 + 截图 | PASS |
| RG-5 L-Real | 浏览器内 5 主题可视且切换持久 | theme.spec + 截图 | PASS |
| RG-8 回退 | 单 revert 恢复单一暗色（无数据/契约迁移） | git | PASS（设计使然） |

| 触发条件 | 结论 | 动作 / 解除条件 | Owner |
|---|---|---|---|
| 用户验收不满意 | HOLD | 按反馈调整令牌后复验 | Codex |

## 5. 回退计划

- 触发条件：主题引擎引发不可快速修复的回归
- 回退顺序：`git revert` 本迭代提交（纯前端、无持久化数据迁移；localStorage 主题键对旧代码无害）
- 不可逆点：无
- 回退后验证：`pnpm typecheck && pnpm lint && pnpm test && pnpm e2e`
- Re-apply 条件：修复后重新提交

## 6. 验收记录

- Baseline：main@c6ffb06（typecheck ✓ / lint 0 警告 / vitest 19 ✓ / playwright 3 ✓ / build ✓）
- 实现与 targeted：T-01..T-04 DONE——`index.css` 令牌契约 + 5 主题组；`lib/themes.ts`/`stores/theme.ts`/`ThemeSwitcher`/`useDropdown`；`index.html` 防闪屏 boot；input 底色/弹层阴影/滚动条去硬编码
- 门禁（T-05）：typecheck ✓ / lint 0 警告 ✓ / vitest 23（含 theme store 4 例）✓ / playwright 5/5 ×2 轮 ✓ / build ✓
- L-Real：e2e 断言默认 graphite、切换即时生效（fresh-mint body=rgb(245,250,248)）、刷新持久；截图 10 张（5 主题 × 登录/概览，`theme-shots.txt`）；石墨白底+墨色主按钮经像素采样确认
- 时序修复：auth e2e 偶发 evaluate 撞导航（401 retry 触发二次 assign）→ `waitForLoadState('networkidle')`，两轮全绿
- 副作用：新增 localStorage 键 `agile-config-ui.theme`；无服务端交互变化
- 验收反馈（2026-09-04）：用户报「貌似不是很对齐」→ 测量取证（`scripts/align-measure.mjs`）：EnvSwitcher 容器 30px vs ThemeSwitcher/UserMenu 28px，垂直中心虽统一但分段控件上下各突出 1px；其余（三卡片 top/bottom、侧栏项、登录居中、菜单项高）均对齐
- 选中态修复（T-09，2026-09-04）：用户反馈选中态背景/字体颜色缺失对比 → 审计脚本实测旧状态 1.04–1.08:1（不可见）；顺带修出一个 Tailwind 命名陷阱（`--color-selected` 命名空间下 `text-selected` 会解析为背景色，须用 `text-selected-foreground`）；修复后 5 主题 4 项断言全过（graphite 17.72 / clear-blue 5.34 / warm-paper 11.86 / navy 6.85 / mint 4.72）
- 对齐修复（T-07）：EnvSwitcher 改单描边分段控件，严格 h-7=28px（border-box），按钮 h-full、项间 border-l 分隔；复测顶栏容器高度集合 {28}、垂直中心统一 23.5；门禁复跑全绿（typecheck/lint/23 unit/5 e2e）

## 7. 文档同步

- [x] 迭代总表（状态 → 验收中）
- [x] AGENT_HANDOFF.md §7.1 多主题决策、§8.7 主题条目
- [ ] docs/PROGRESS.md（用户验收后回填 VERIFIED）
- [x] Goal 账本、Evidence 和 next task

## 8. 遗留与回流

| ID | 遗留 | 严重度 | 不阻断理由 | Owner / Backlog |
|---|---|---|---|---|
| L-01 | 静态稿目录 `design/previews/` 去留 | P3 | 决策证据；不影响运行 | Codex / ITER-03 收口时定 |
| L-02 | prefers-color-scheme 自动跟随 | P3 | 未要求；默认石墨已定 | Backlog / ITER-08 评估 |
