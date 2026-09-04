# 迭代卡 ITER-04 - 配置管理（M2）

> 状态：验收中（EVIDENCE_READY，2026-09-04 实现与自动化门全绿，等待用户验收）
> 开工复审：GR-1..10 PASS（依据同 ITER-03 模式：oracle=e2e+性能断言+用户验收；GR-6 无安全面变化；GR-8 回退=revert）
> Baseline：@e928d2d（46 unit + 7 e2e 全绿）
> 变更分类：大改（核心数据面 + 虚拟滚动性能要求 + 继承视图组合逻辑）
> 方案出处：handoff §6 P0 + §10 M2 + UX #2/5/11/12；API 见 [../API_INVENTORY.md](../API_INVENTORY.md)
> 日期：2026-09-04 建卡 / 未开始
> Goal 审查：PENDING（开工复审；大改需方案先行）
> 当前授权边界：建卡已授权；实现需用户确认开工
> 依赖：ITER-03（应用列表入口）

## 1. 目标与范围

- 做什么：配置表格三视图（表格/KV/JSON(monaco)）、增删改、取消改动（单/批量）、批量删除、group 分组折叠、即时过滤（前端+服务端）、行内快编 value、**待发布徽标（add/edit/delete 三色计数，轮询 WaitPublishStatus）**、继承应用标识与合并生效视图、并发编辑保护（updateTime 比对）、**虚拟滚动（TanStack Virtual，1000+ 条流畅）**
- 不做什么：发布/回滚动作（ITER-05）、JSON 文件导入导出与环境同步（ITER-08）
- 完成定义：对 `demo_app` 增改删后徽标计数正确；脚本灌 1000+ 配置表格仍流畅（帧率/交互达标）；继承标识正确展示；E2E 绿

### 1.1 Goal 定义

| Goal | 用户/系统结果                                              | Baseline / 当前差距 | Closure rule                         | Owner |
| ---- | ---------------------------------------------------------- | ------------------- | ------------------------------------ | ----- |
| G0   | 用户可在三视图下管理配置并实时看到待发布状态；千级数据流畅 | 无配置页            | E2E 绿 + 千条性能实测记录 + 用户验收 | Codex |

### 1.2 API 覆盖（15 端点，详见 API_INVENTORY）

`Config/Search`、`Config/Get`、`Config/Add`、`Config/AddRange`、`Config/Edit`、`Config/Delete`、`Config/DeleteSome`、`Config/CancelEdit`、`Config/CancelSomeEdit`、`Config/All`、`Config/GetKvList`、`Config/GetJson`、`Config/SaveJson`、`Config/SaveKvList`、`Config/WaitPublishStatus`

## 2. 任务草案

| Task | 内容                                                                                    | Verify                   |
| ---- | --------------------------------------------------------------------------------------- | ------------------------ |
| T-01 | `api/configs.ts` 15 端点 + ConfigVM/editStatus 状态机类型                               | 单测                     |
| T-02 | 表格视图（分组折叠/多选/批量/行内快编/虚拟滚动）                                        | 单测 + 千条性能脚本      |
| T-03 | KV 视图 + JSON 视图（monaco 集成）                                                      | 组件测试 + 截图          |
| T-04 | 待发布徽标（轮询）+ 继承合并视图（先核实待核实 #7：读旧 UI Configs 源码定数据组合方式） | E2E + 文档回写           |
| T-05 | 并发编辑保护（updateTime 比对提示）                                                     | 单测 + 手测脚本          |
| T-06 | E2E + 性能证据（对自建应用灌 1000 条，不动 demo_app）                                   | `docs/evidence/ITER-04/` |

## 3. Release Gates（要点）

RG-1 baseline；RG-2 GREEN；RG-5 L-Real（真实实例+千条数据）；性能 oracle：过滤/滚动交互 P95 < 100ms；RG-7 全量回归

## 4. 风险与遗留

- 待核实 #7（继承合并视图数据来源）在 T-04 前定案并回写 handoff §12
- monaco-editor 体积：按需加载（动态 import），避免拖累首屏


| T-07 | G0 / 验收反馈修复：面包屑 + KV 显示 bug + jsonc 注释 | 用户反馈：加面包屑；KV 视图显示 [object Object]；JSON 注释疑问 | ① Breadcrumb 组件（≥2 级页面，交互规范 §6.5，当前段 h1）；② KV bug 根因=服务端返回 KeyValuePair[] 数组，api 层转为 `group:key=value` 行文本（demo_app 实勘通过）；③ jsonc 语义确认：注释=描述字段为上游设计，monaco 诊断放开 allowComments；④ YAML→JSON 评估入 Backlog B-01 | E2E 11/11 复绿；实勘截图 breadcrumb/kv/jsonc ×3 | T-06 | Codex / DONE |

## 5. 验收记录（2026-09-04）

- Baseline：@e928d2d（typecheck/lint/46 unit/7 e2e 全绿）
- 实现 T-01..T-05：
  - `api/configs.ts` 15 端点（SaveKvList/SaveJson 字段名以 SaveJsonVM 实测修正：str/json）；EditStatus 状态机类型
  - 表格视图：虚拟滚动（@tanstack/react-virtual）+ 分组折叠 + 客户端即时过滤 + 多选批量（删除/取消）+ 行内快编 value（回车保存/Esc 取消）+ 状态徽标（已上线/未上线/新增/修改/删除）
  - KV 视图（补丁模式默认开）+ JSON 视图（monaco 本地打包 worker、懒加载独立分包 854KB gzip、五主题适配、脏态切换守卫）
  - 待发布条常显 + 10s 轮询（UX #2）；发布按钮占位指向 ITER-05
  - 继承合并视图（待核实 #7 定案：前端组合，本应用覆盖优先、继承行只读标注）
  - 并发编辑保护：保存前比对服务端 updateTime，冲突时"覆盖/放弃"二选（弹窗与行内快编两处）
- **服务端语义实测修正**（重要）：未发布新增在 Search 行级 `editStatus=0` 且 `onlineStatus=0`——"新增"由 onlineStatus 表达；editStatus 只标 2=修改/3=删除。行级徽标与取消/批量判定均已按此实现并回写认知
- 门禁：typecheck ✓ / lint 0 ✓ / vitest 46 ✓ / playwright 11/11（configs 4 例：CRUD+计数 / KV 往返 / JSON / 继承合并）✓ / build ✓
- 性能（T-06 oracle）：灌入 1000 条（10 批 AddRange 6.3s）→ 渲染 DOM 节点 29（<60 阈值）滚动总高 34340px；过滤 1000→10 行收敛 12ms（<300ms）→ PASS（`perf-report.txt`）
- Evidence：`docs/evidence/ITER-04/`（configs-table-demo.png / perf-1000-virtual.png / perf-filter.png / perf-report.txt）
- 已知边界：删除已发布配置产生"待发布删除"徽标的正向用例需发布能力，归 ITER-05 补 E2E
