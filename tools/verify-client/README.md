# C# 验证客户端（tools/verify-client）

用官方 `AgileConfig.Client` SDK 编写的 .NET 8 控制台程序，对配置中心做**端到端真实验证**（L-Real）：拉取、实时推送、心跳在线。

## 验证覆盖

| 场景 | 结果（2026-09-07，本机 5017 实例） |
|---|---|
| WebSocket 连接 + 全量拉取 | ✅ 连接成功，拉到 3 条配置（含分组键 `app:key`） |
| **在线变更免重启生效** | ✅ 管理端把 `app:timeout_seconds` 30→77 并发布，客户端 ~1s 内收到 `ConfigChanged` 推送并输出新值 77（全程无重启） |
| 心跳上报 → 管理端"客户端"页 | ✅ `/clients` 显示在线行（appId/IP/最后心跳/最后刷新/**一致性=已同步**），支持重载/下线操作 |
| 环境维度 | DEV 连接；切环境需带 env 参数重连 |

> 运行前提（本机演示拓扑的两个坑，均已实测）：
> 1. 单容器 adminConsole 模式下，节点表默认为空 → `SearchServerNodeClients` 只聚合"在线节点"的客户端，会恒为空。需注册一个**容器内可达**的节点地址（Docker 拓扑下是 `http://localhost:5000`，不是宿主机的 5017），等 echo 探活（~30s 周期）把它置为在线。
> 2. 应用的 `secret` 由客户端在 `App/Add`/`App/Edit` 时提供，服务端不自动生成；为空则客户端连不上时难以排查。

## 运行

```bash
cd tools/verify-client
dotnet run -- <appId> <secret> <serverUrl> <env> <运行秒数>
# 例（secret 从管理端应用详情查看）：
dotnet run -- csharp_demo <secret> http://localhost:5017 DEV 60
```

程序行为：连接 → 打印全量配置 → 订阅 `ConfigChanged`/`ReLoaded` 推送 → 每 2s 打印哨兵值（此时在管理端改值并发布，观察免重启变化）→ 超时退出。Ctrl+C 提前退出。

证据：`docs/evidence/C-SHARP-VERIFY/`（客户端 transcript ×2 + 客户端页在线截图）。
