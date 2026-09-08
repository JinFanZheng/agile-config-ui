# ITER-15 接入指南补「依赖注入与 IConfiguration」节

> 状态：✅ VERIFIED（原 EVIDENCE_READY，2026-09-08 实测验证 + 全量门禁绿，等待用户验收）。
> 变更分类：小改（指南内容增强，单页文件族）。前置：ITER-10。

## 1. 目标

- G1：回答并落地"SDK 是否支持 DI/IOptions 用法"——`AddAgileConfig`（IConfigurationBuilder/IServiceCollection）+ `IOptionsMonitor<T>` 热更新，全部**实测验证后**写入指南（未实测用法只提及不展开）
- G2：新增第六节进入锚点目录与 e2e 六节断言

## 2. 实测结论（服务端 1.13.2 + AgileConfig.Client 1.9.1）

- `AddAgileConfig(ConfigClientOptions)` 注册标准 IConfigurationProvider；`group:key` → 分层键
- `services.AddAgileConfig()` 注册 IConfigClient（已连接单例）
- 发布 → `IOptionsMonitor.OnChange` 同秒触发，`CurrentValue` 与 IConfiguration 同步翻转（WS 推送）
- 坑：控制台宿主需 `using Microsoft.AspNetCore.Hosting`；OnChange 不必然代表值变化；IConfigClient 接口面窄（元信息走 client.Options）

## 3. 验收记录（2026-09-08）

- 临时应用 `guide_di_<ts>` 随机前缀自建、v1→v3 三次发布驱动热更新验证、验证后删除（App/Search 复核 3 应用原状）
- 指南：strings/guide.ts `diIntegration` 块 + snippets（diSetup/diOptions）+ DiIntegrationSection + 页面接线
- 门禁：vitest 118（+1）/ e2e 37（六节断言）/ build ✓
- 证据：docs/evidence/ITER-15/（transcript + 可复现验证程序 + README）
