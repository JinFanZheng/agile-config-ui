# 迭代卡 ITER-04 - 配置管理（M2）

> 状态：PLANNED（开工时完成 GR 复审与 baseline 冻结）
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

| Goal | 用户/系统结果 | Baseline / 当前差距 | Closure rule | Owner |
|---|---|---|---|---|
| G0 | 用户可在三视图下管理配置并实时看到待发布状态；千级数据流畅 | 无配置页 | E2E 绿 + 千条性能实测记录 + 用户验收 | Codex |

### 1.2 API 覆盖（15 端点，详见 API_INVENTORY）

`Config/Search`、`Config/Get`、`Config/Add`、`Config/AddRange`、`Config/Edit`、`Config/Delete`、`Config/DeleteSome`、`Config/CancelEdit`、`Config/CancelSomeEdit`、`Config/All`、`Config/GetKvList`、`Config/GetJson`、`Config/SaveJson`、`Config/SaveKvList`、`Config/WaitPublishStatus`

## 2. 任务草案

| Task | 内容 | Verify |
|---|---|---|
| T-01 | `api/configs.ts` 15 端点 + ConfigVM/editStatus 状态机类型 | 单测 |
| T-02 | 表格视图（分组折叠/多选/批量/行内快编/虚拟滚动） | 单测 + 千条性能脚本 |
| T-03 | KV 视图 + JSON 视图（monaco 集成） | 组件测试 + 截图 |
| T-04 | 待发布徽标（轮询）+ 继承合并视图（先核实待核实 #7：读旧 UI Configs 源码定数据组合方式） | E2E + 文档回写 |
| T-05 | 并发编辑保护（updateTime 比对提示） | 单测 + 手测脚本 |
| T-06 | E2E + 性能证据（对自建应用灌 1000 条，不动 demo_app） | `docs/evidence/ITER-04/` |

## 3. Release Gates（要点）

RG-1 baseline；RG-2 GREEN；RG-5 L-Real（真实实例+千条数据）；性能 oracle：过滤/滚动交互 P95 < 100ms；RG-7 全量回归

## 4. 风险与遗留

- 待核实 #7（继承合并视图数据来源）在 T-04 前定案并回写 handoff §12
- monaco-editor 体积：按需加载（动态 import），避免拖累首屏
