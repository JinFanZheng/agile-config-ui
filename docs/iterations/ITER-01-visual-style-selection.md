# 迭代卡 ITER-01 - 视觉风格选型：静态稿供用户选择

> 状态：进行中（ACTIVE，等待用户选型反馈）
> 变更分类：中改（改变全站视觉方向的关键决策，但本卡只产出静态稿与决策记录，不动生产代码）
> 方案出处：用户反馈「这个风格不太喜欢」（2026-09-04，针对 M0 已实现的 Linear 暗色风格）+ 明确指示「生成几个不同风格的静态网页，我选一下」
> 日期：2026-09-04 开始 / 未完成
> Goal 审查：PASS（见 1.3，GR-1..GR-10）
> 当前授权边界：允许——写 `docs/`、`AGENTS.md`、`design/previews/` 静态稿、起本地静态服务器、回写事实源、git 提交；禁止——改 `src/` 生产代码（换肤属选型后的后续迭代卡）、发布、对外通知
> 复审触发：用户选型结果落地 / 静态稿范围变化 / 环境语义色等不变量被要求改变

## 1. 目标与范围

- 做什么：产出 ≥4 份风格显著不同的静态预览页（同一产品界面、同一数据、同一信息结构，仅视觉语言不同），本地伺服供用户对比选择；用户选定后把新设计语言回写 `AGENT_HANDOFF.md` §7.1
- 不做什么：不重做信息架构与交互（第 0 节北极星不变）；不动 `src/` 生产代码；不做亮/暗双主题的完整实现
- 影响面：仅新增 `design/previews/`、`docs/` 事实源；后续所有 UI 迭代的视觉方向
- 完成定义：用户明确选定一种方向（或明确要求再出新稿），选择结果与理由回写事实源，卡片收口

### 1.1 Goal 定义

| Goal | 用户/系统结果 | Baseline / 当前差距 | Closure rule | Owner |
|---|---|---|---|---|
| G0 | 用户从静态稿中选定 1 种视觉方向，且该决策已回写 `AGENT_HANDOFF.md` §7.1（替换已否决的 Linear 暗色描述），后续迭代以此为准 | M0 实现 §7.1 原 Linear 暗色（commits 8b2e779..7f35f10）；用户明确否决；无替代方向 | 用户在聊天中明确选定 + §7.1 文本已更新 + 本卡与总表同步 | Codex（产出与回写）/ 用户（选择） |

### 1.2 Goal -> Task -> Gate -> Evidence

| Goal | Tasks | Closure Gates | Evidence |
|---|---|---|---|
| G0 | T-01..T-05 | RG-1 baseline（用户否决事实）；RG-2 静态稿就绪且可访问；RG-5 真实预览（用户在浏览器中查看）；RG-8 决策回写 | `docs/evidence/ITER-01/` |

### 1.3 Goal 审查

| Review | 日期 | 结论 | 阻断发现 | 处理结果 |
|---|---|---|---|---|
| Initial | 2026-09-04 | PASS | 无 P0/P1；P3：静态稿属设计物料，是否入库待用户选型后决定（保留为决策证据，暂入库） | 已登记 §8 L-02 |

| Gate | GR-1 | GR-2 | GR-3 | GR-4 | GR-5 | GR-6 | GR-7 | GR-8 | GR-9 | GR-10 |
|---|---|---|---|---|---|---|---|---|---|---|
| 结果 | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |

依据摘要：GR-1 结果性=用户可观察的决策落地而非「做了稿」；GR-2 oracle 明确（用户明确选择 + 回写）；GR-3 卡↔任务↔证据闭环；GR-4 next task 明确（T-03→T-05）；GR-5 无虚构依赖；GR-6 安全面=静态稿仅含虚构 mock 数据、无真实凭证/API 调用；GR-7 证据=HTTP 200 + 截图 + 溢出检查；GR-8 回退=纯新增文件，`git revert` 即净；GR-9 卡片保持 ACTIVE 直至用户选择；GR-10 本轮内同步 handoff/总表/PROGRESS。

### 1.4 Goal 进度账本

| Goal | 状态 | Baseline / 当前差距 | Closure rule | Evidence | Next ready task | Blocker / Owner |
|---|---|---|---|---|---|---|
| G0 | ACTIVE | 5 份静态稿已产出并本地伺服（见 §6）；差距=用户尚未选择 | 用户明确选定 + §7.1 回写 | `docs/evidence/ITER-01/` | T-05 用户选型（owner: 用户） | 等待用户反馈 / Codex |

## 2. 任务与依赖

| Task | Goal / Goal Delta | Input | Output | Verify / Evidence | Depends on | Owner / 状态 |
|---|---|---|---|---|---|---|
| T-01 | G0 / 协议落地与卡片建立 | 协议文档、用户反馈 | AGENTS.md、INDEX.md、本卡 | 文档存在且自洽 | 无 | Codex / DONE |
| T-02 | G0 / 风格决策重开写回事实源 | 用户否决反馈 | AGENT_HANDOFF.md §7.1 标注 | diff 检查 | T-01 | Codex / DONE |
| T-03 | G0 / 5 份风格静态稿 + 索引页 | 同一界面结构 + mock 数据（无真实凭证） | `design/previews/*.html` | HTTP 200 ×6 | T-01 | Codex / DONE |
| T-04 | G0 / 预览真实可用性检查 | T-03 产物、本地 5019 伺服 | 截图 + 溢出检查报告 | `docs/evidence/ITER-01/` | T-03 | Codex / DONE |
| T-05 | G0 / 用户选型 | T-04 通过的静态稿 | 聊天中的明确选择 | 选择记录回填本卡 | T-04 | 用户 / 等待中 |

## 3. 测试与验收计划

| 层 | 场景与 Oracle | 命令 / 资源 | Evidence |
|---|---|---|---|
| L0 | 6 个 HTML 均可解析、伺服 200 | `python3 -m http.server 5019` + curl | `check-report.txt` |
| L-Real | 用户在浏览器实际查看并对比（viewport 1280×800 无横向溢出、env 语义色可辨） | `scripts/preview-check.mjs`（Playwright 截图 + scrollWidth 断言） | 截图 ×6 + 检查输出 |

## 4. Release Gates 与停止条件

| Gate | PASS 条件 | Evidence | 状态 |
|---|---|---|---|
| RG-1 Baseline | 用户否决事实与当前主题 commit 冻结记录 | 本卡 §1.1 + git log 7f35f10 | PASS |
| RG-2 静态稿就绪 | ≥4 份风格迥异、同结构同数据的静态页可访问 | `check-report.txt` | PASS |
| RG-5 L-Real | 用户真实查看并给出选择 | 聊天记录（待回填） | PENDING |
| RG-8 回退 | 纯新增文件，revert 即净，不动生产代码 | git diff 范围 | PASS |

| 触发条件 | 结论 | 动作 / 解除条件 | Owner |
|---|---|---|---|
| 用户要求全部重做 | HOLD→新稿 | 回到 T-03 重产出 | Codex |
| 用户希望混搭多种风格元素 | PASS 方向 | 拆解为令牌级组合后回写 §7.1 | Codex |

## 5. 回退计划

- 触发条件：用户不满意全部静态稿
- 回退顺序：无需回退（纯新增）；删除 `design/previews/` 即回到原状
- 数据与旧 reader 保护：不涉及
- 不可逆点：无
- 回退后验证：`pnpm typecheck && pnpm lint && pnpm test` 仍绿（未触碰 src）
- Re-apply 条件：用户给出更明确的方向描述后重出稿

## 6. 验收记录

- Baseline：M0 Linear 暗色主题（commits 8b2e779..7f35f10）+ 用户否决反馈，2026-09-04
- 实现与 targeted：T-01..T-04 完成；5 份静态稿 + 索引：
  - `a-clear-blue.html` 晨雾蓝（亮色 · 企业清爽）
  - `b-warm-paper.html` 暖纸（亮色 · 极简温润）
  - `c-graphite.html` 石墨（亮色 · 黑白高对比开发者风）
  - `d-navy-console.html` 深蓝中控（暗色 · 运维控制台）
  - `e-fresh-mint.html` 薄荷（亮色 · 清新 SaaS）
- L-Real：http://localhost:5019/ 伺服中；`docs/evidence/ITER-01/` 截图与检查输出
- 副作用：无（静态文件、无 API 调用、无真实凭证）

## 7. 文档同步

- [x] 迭代总表（INDEX.md）
- [x] AGENT_HANDOFF.md §7.1 风格决策重开标注
- [x] docs/PROGRESS.md（M1 待风格定稿）
- [x] Goal 账本、Evidence 和 next task

## 8. 遗留与回流

| ID | 遗留 | 严重度 | 不阻断理由 | Owner / Backlog |
|---|---|---|---|---|
| L-01 | 选型后需新开迭代卡：src/ 全面换肤 + 令牌重写 + M0 页面回归 | P2 | 属选型后的后续工作，非本卡范围 | Codex / 选型后建卡 |
| L-02 | 静态稿是否长期保留在仓库（现作为决策证据保留） | P3 | 不影响任何功能 | Codex / ITER-02 收口时定 |
