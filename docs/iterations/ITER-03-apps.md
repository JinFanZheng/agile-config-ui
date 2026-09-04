# 迭代卡 ITER-03 - 应用管理（M1）

> 状态：完成（G0 VERIFIED，2026-09-04 用户验收通过「继续下一个模块」）
> 变更分类：中改
> 方案出处：handoff §6 P0 + §10 M1；API 见 [../API_INVENTORY.md](../API_INVENTORY.md)
> 日期：2026-09-04 建卡 / 未开始
> Goal 审查：PASS（2026-09-04 开工复审）
> GR 依据：GR-1 结果=E2E 可观察全链路；GR-2 oracle=e2e 断言+用户验收；GR-3 卡↔任务↔证据闭环；GR-4 T-01..T-05 依赖真实（api→列表→弹窗→动作→E2E）；GR-6 无安全面变化（凭证逻辑不动，新页面走既有 Bearer 链路）；GR-7 L0+L1+E2E(L-Real 对本机实例)；GR-8 回退=revert；GR-9 用户验收前不标完成；GR-10 完成时同步 API_INVENTORY 回填
> 当前授权边界：建卡已授权；实现需用户确认 ITER-02 验收并下达开工指令
> 依赖：ITER-02（主题系统）验收通过

## 1. 目标与范围

- 做什么：应用列表（分组视图/搜索/分页/启停状态）、新建（**自动生成 ID**，可改）、编辑、启停、删除（二次确认+危险色）、Secret 查看+一键复制、复制 AppId；新建/编辑可选继承应用；空态引导
- 不做什么：应用导入导出（ITER-08）、应用授权（ITER-07）、配置页（ITER-04）
- 完成定义：E2E 自建应用全链路（创建→编辑→停用→删除）通过；UI 糟点修复（ID 自动生成）可演示；`demo_app` 不被触碰

### 1.1 Goal 定义

| Goal | 用户/系统结果                                                                             | Baseline / 当前差距               | Closure rule                           | Owner |
| ---- | ----------------------------------------------------------------------------------------- | --------------------------------- | -------------------------------------- | ----- |
| G0   | 用户可完成应用全生命周期管理（建/查/改/启停/删/取凭证），ID 由前端自动生成，全链路 E2E 绿 | 无应用管理页（仅侧栏入口+占位页） | E2E `apps.spec.ts` 全链路绿 + 用户验收 | Codex |

### 1.2 API 覆盖（11 端点，详见 API_INVENTORY）

`App/Search`（升级现有调用）、`App/Add`、`App/Edit`、`App/Get`、`App/DisableOrEnable`、`App/Delete`、`App/GetAppGroups`、`App/InheritancedApps`；复用已接：`admin/jwt/login` 等 M0 端点。

## 2. 任务草案

| Task | 内容                                                | Verify                   |
| ---- | --------------------------------------------------- | ------------------------ |
| T-01 | `api/apps.ts` 补全 11 端点 + 类型（含实测动词确认） | 单测：参数拼装           |
| T-02 | 应用列表页（分组折叠/搜索/分页/待发布徽标占位）     | 组件测试 + 截图          |
| T-03 | 新建/编辑弹窗（自动生成 ID、继承应用多选）          | 单测 + E2E               |
| T-04 | Secret 查看/复制、启停、删除（二次确认）            | E2E                      |
| T-05 | E2E 全链路（e2e_&lt;ts&gt;_app 自建自清）+ 证据     | `docs/evidence/ITER-03/` |

## 3. Release Gates（要点）

RG-1 baseline 冻结；RG-2 全 task GREEN；RG-4 权限码（App_Add 等隐藏无权按钮）；RG-5 L-Real 对本机实例全链路；RG-7 回归（auth/theme e2e 不回归）

## 4. 遗留

无（建卡阶段）

| T-06 | G0 / 用户验收 | T-05 | 验收结论回填 | 聊天记录 | T-05 | 用户 / 反馈：内容区与设计稿未对齐 |
| T-07 | G0 / 布局对齐 + 小屏适配 | 用户反馈（确认属实：限宽居中 vs 全宽流式、顶栏墨线缺失、行高 41 vs 33、表头无底色） | 全宽流式（去 max-w）；--border-header 令牌（石墨墨线）；表格密度 34.5px、表头 bg-elevated、修 bg-input/40 不渲染；<md 抽屉侧栏（汉堡+遮罩+Esc）、顶栏控件收纳、表格横向滚动 | 指标复测 + 375px 验证（见验收记录） | T-06 | Codex / DONE |
| T-08 | G0 / 用户复验 | T-07+T-09 | 复验结论：通过（2026-09-04，用户确认接口接入并指示继续 ITER-04） | 聊天记录 | T-09 | 用户 / DONE |

| T-09 | G0 / 交互规范与体验优化包 | 用户反馈：要动画（Modal 等）；脏表单点空白即关丢数据；要求沉淀交互规范 | ① 微动效基建（5 个预置动画类 120–150ms ease-out + prefers-reduced-motion 降级）接入 Modal/ConfirmDialog/菜单/抽屉/Toast；② useDirtyGuard 脏表单保护（Esc/遮罩/X/取消→放弃确认）接入 AppDialog；③ Toast 反馈系统（store+容器，变更成功/失败）；④ 空态≠无结果区分、删除后分页回退、继承列表加载态；⑤ docs/INTERACTION_GUIDELINES.md 八章规范 + AGENTS.md 红线挂接 | 单测 +7（toast/dirtyGuard）、E2E +1（脏态保护）全绿；截图 interaction-*.png | T-08 | Codex / DONE |

## 5. 验收记录（2026-09-04）

- Baseline：@v0.1.0/6643cad（typecheck/lint/23 unit/5 e2e 全绿）
- 实现：T-01..T-04 DONE——`api/apps.ts` 8 端点（Search/Get/Add/Edit/DisableOrEnable/Delete/GetAppGroups/InheritancedApps）；`lib/appId.ts` 生成器（app-+8 位，1e4 次唯一性单测）；列表页（搜索防抖/分组过滤/分页/状态与公共应用徽标/空态引导/骨架/错误重试）；新建·编辑弹窗（自动 ID 可改、编辑 ID 锁定、分组 datalist、公共应用与继承多选）；Secret 查看弹窗 + AppId/Secret 一键复制；启停/删除二次确认（确认键重复动作动词，删除走 danger）
- 复用共享件：Modal / ConfirmDialog / CopyButton（后续迭代直接复用）
- 门禁（T-05）：typecheck ✓ / lint 0 警告 ✓ / vitest 39（+16：appId 生成器与校验、表单 schema、既有）✓ / playwright 6/6（+1 应用全生命周期）✓ / build ✓
- 数据纪律：E2E 用例自建 `e2e_<ts>_app` 并用例内清理 + afterAll API 兜底；`demo_app` 实测完好（/App/Get 200）
- Evidence：`docs/evidence/ITER-03/`（apps-page.png、apps-secret-dialog.png）
- 决策记录：TanStack Table 推迟到 ITER-04（应用列表数据量小，手写表格足够；表格库在配置页的大数据/虚拟滚动场景才发挥价值）——回流 §8
- 验收反馈与布局对齐（T-07，2026-09-04）：用户指出内容区与设计稿未对齐，实测确认四项差异（限宽居中 vs 全宽流式 / 石墨顶栏墨线缺失 / 行高 41 vs 33 / 表头无底色）。修复：内容区全宽流式（Home/Apps/Placeholder 去 max-w）；新增 --border-header 令牌×5 主题（石墨=墨黑 #18181B，其余=各稿原语义）；表格密度对齐 C 稿（行高 34.5≈33、表头 bg-elevated 灰底、操作钮收紧）；小屏适配（<md 抽屉侧栏+汉堡+遮罩+Esc、主题/用户图标化、Env 收窄、表格横向滚动 min-w 760）。复测指标全部对齐（顶栏 48/墨线 rgb(24,24,25) 一致、卡片 1038≈1042 全宽、表头 rgb(250,250,250)、375px 无横向溢出且抽屉可用）；门禁全绿 39 unit + 6 e2e。证据：apps-aligned-1280.png / apps-375px.png
