# 迭代总表

> 遵循 [../CODEX_GENERAL_ITERATION_PROTOCOL.md](../CODEX_GENERAL_ITERATION_PROTOCOL.md)。新会话恢复顺序：AGENTS.md → 本表 → 当前迭代卡 → next ready task → Evidence → `git status`。
> **API 全量适配约束**：管理面 86 端点的清点与逐迭代映射见 [../API_INVENTORY.md](../API_INVENTORY.md)（用户要求：全部适配，豁免需确认）。

## 当前 WIP

| 迭代                              | 标题           | 状态   | 最高风险 next ready task   |
| --------------------------------- | -------------- | ------ | -------------------------- |
| [ITER-08](ITER-08-delivery.md) | 打磨与交付（M6） | ACTIVE | T-01 端点形状核实（见卡） |

## 迭代路线图（2026-09-04 与用户约定：逐迭代交付，验收一个再继续；跨模块独立页用子代理并行）

| ID      | 标题                                                             | 对应里程碑 | API 端点 | 状态        | 卡片                                                                   | Evidence                 |
| ------- | ---------------------------------------------------------------- | ---------- | -------- | ----------- | ---------------------------------------------------------------------- | ------------------------ |
| ITER-01 | 视觉风格选型                                                     | —          | —        | ✅ VERIFIED | [ITER-01-visual-style-selection.md](ITER-01-visual-style-selection.md) | `docs/evidence/ITER-01/` |
| ITER-02 | 主题系统与通用基建                                               | M0 增量    | —        | ✅ VERIFIED | [ITER-02-theme-system.md](ITER-02-theme-system.md)                     | `docs/evidence/ITER-02/` |
| ITER-03 | 应用管理                                                         | M1         | 11       | ACTIVE      | [ITER-03-apps.md](ITER-03-apps.md)                                     | —                        |
| ITER-04 | 配置管理（三视图/徽标/虚拟滚动/继承）                            | M2         | 15       | PLANNED     | [ITER-04-configs.md](ITER-04-configs.md)                               | —                        |
| ITER-05 | 发布链路（diff/发布/时间线/回滚——产品本体）                      | M3         | 5        | PLANNED     | [ITER-05-publish.md](ITER-05-publish.md)                               | —                        |
| ITER-06 | 运维视图（概览/客户端一致性/节点/日志/远程操作；**子代理并行**） | M4         | 22       | PLANNED     | [ITER-06-ops.md](ITER-06-ops.md)                                       | —                        |
| ITER-07 | 权限体系（用户/角色/应用授权/按钮级权限）                        | M5         | 13       | PLANNED     | [ITER-07-permissions.md](ITER-07-permissions.md)                       | —                        |
| ITER-08 | 打磨与交付（导入导出/环境同步/服务注册/SSO/Docker）              | M6         | 12       | PLANNED     | [ITER-08-delivery.md](ITER-08-delivery.md)                             | —                        |

> 覆盖核对：M0 已适配 3 + ITER-03..08 共 78（含 Search 归 03、WaitPublishStatus 归 04、发布共用）+ 显式豁免 4（`Admin/Logoff`、`Home/IndexAsync`、`Home/Echo`、`Home/GetIP`；另有 `RemoteOP/RegisterNode` 待 ITER-06 定案）= 86 ✓。豁免需用户确认，见 API_INVENTORY 文末。

## 历史变更（协议采用前）

| 时间       | 内容                                        | 记录                                                                                                                               |
| ---------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-04 | M0 脚手架（登录/首启/401/布局壳），DoD 全过 | [../PROGRESS.md](../PROGRESS.md)，commits 8b2e779..7f35f10。M0 所用 Linear 暗色风格已被用户否决并升级为多主题体系（见 ITER-01/02） |
