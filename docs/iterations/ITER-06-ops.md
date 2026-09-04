# 迭代卡 ITER-06 - 运维视图（M4）

> 状态：PLANNED（开工时完成 GR 复审与 baseline 冻结）
> 变更分类：大改（22 端点、四个独立页面——**本卡用子代理并行**：概览+客户端 | 节点+日志 两路分派，共享 api 层先行串行）
> 方案出处：handoff §6 P1 + §10 M4 + UX #13；API 见 [../API_INVENTORY.md](../API_INVENTORY.md)
> 日期：2026-09-04 建卡 / 未开始
> Goal 审查：PENDING（开工复审）
> 依赖：ITER-05（发布链路提供影响面提示的挂载点）

## 1. 目标与范围

- 做什么：概览仪表（App/Config/Node/Service 计数 + 系统信息含版本[替换侧栏硬编码] + 会话刷新）；**客户端在线列表与一致性视图**（服务端最新版本 vs 客户端上报版本，未跟上的醒目标出——依赖待核实 #8）；客户端运维动作（重载/下线，经 RemoteOP 与 Proxy，全部二次确认+danger）；节点管理（列表/添加/删除）；系统日志（分页/过滤）
- 不做什么：服务注册中心（ITER-08）
- 完成定义：各页数据正确、轮询刷新可用；一致性视图若 #8 证实可行则交付，否则文档化放弃理由

### 1.1 Goal 定义

| Goal | 用户/系统结果                                                         | Baseline / 当前差距 | Closure rule                          | Owner |
| ---- | --------------------------------------------------------------------- | ------------------- | ------------------------------------- | ----- |
| G0   | 用户可观察系统全貌（统计/客户端/节点/日志）并对客户端执行安全运维动作 | 侧栏均为禁用占位    | 各页 E2E/截图绿 + 轮询演示 + 用户验收 | Codex |

### 1.2 API 覆盖（22 端点，详见 API_INVENTORY）

- Home：`Sys`、`Current`
- Report：`Clients`、`ServerNodeClients`、`SearchServerNodeClients`、`AppCount`、`ConfigCount`、`NodeCount`、`ServiceCount`、`RemoteNodesStatus`
- RemoteOP：`AllClientsDoActionAsync`、`AppClientsDoActionAsync`、`OneClientDoActionAsync`、`ClearConfigServiceCache`、`ClearServiceInfoCache`
- Proxy：`Client_Offline`、`AllClients_Reload`、`Client_Reload`
- ServerNode：`All`、`Add`、`Delete`
- SysLog：`Search`
- 豁免候选复核：`RemoteOP/RegisterNode`（读源码定案）

## 2. 任务草案

| Task             | 内容                                                                                                                             | Verify                               |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| T-00             | 待核实 #2（管理端 WebSocket？读旧 UI 源码）与 #8（客户端版本上报字段，读 ReportController+心跳实体+实测）定案 → 回写 handoff §12 | 源码引用 + curl 实测                 |
| T-01             | `api/` 层 22 端点（串行，共享依赖）                                                                                              | 单测                                 |
| T-02a（子代理A） | 概览仪表 + Sys 驱动版本号                                                                                                        | 截图 + 数据断言                      |
| T-02b（子代理B） | 节点管理 + 系统日志页                                                                                                            | 截图 + E2E                           |
| T-03（汇合）     | 客户端列表 + 一致性视图 + 运维动作（涉及 UX #13 核心价值，主线自做）                                                             | E2E（自建应用+真客户端或文档化降级） |
| T-04             | 轮询策略（TanStack Query refetchInterval）与页面离开停止                                                                         | 单测                                 |

## 3. Release Gates（要点）

RG-1 baseline；RG-2 GREEN；RG-4 危险操作权限码（RemoteOP 类）+ 二次确认；RG-5 L-Real（真实节点/客户端数据；无真客户端时一致性视图用文档化降级并如实标注证据强度）；RG-7 全量回归

## 4. 风险

- 本机实例无常驻业务客户端 → 一致性视图可能无真实数据可验：准备最小 .NET 客户端 demo 或标注 Mock 证据强度不冒充 L-Real
- 子代理并行分区：api 层与共享组件由主线先冻结，页面实现分派，避免同时改账本
