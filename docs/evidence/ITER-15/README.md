# ITER-15 证据 — 接入指南新增「依赖注入与 IConfiguration」节

问题出处：用户指出指南只写了手动 `new ConfigClient(options)`，问是否有 `IOptionsMonitor<T>` / `IConfigClient` 式 DI 用法。**答案：有**，且逐项实测验证后才写入指南。

## 验证方法（AgileConfig 服务端 1.13.2 @5017 + AgileConfig.Client 1.9.1，与本仓库 verify-client 同版本）

1. **API 面**（反射 dump NuGet 包，见调研记录）：`AgileConfigProvider : Microsoft.Extensions.Configuration.ConfigurationProvider`；`IConfigurationBuilder.AddAgileConfig` 七个重载（扩展类在 `Microsoft.AspNetCore.Hosting` 命名空间）；`IServiceCollection.AddAgileConfig()`；`IHostBuilder.UseAgileConfig`；`IConfigClient` 接口成员 = Get/索引器/GetGroup/Data/ConnectAsync/Load/两事件/Options。
2. **实机链路**（`DiVerify.Program.cs` 可复现）：临时应用 `guide_di_<ts>`（随机前缀，验证后已删除）+ Db:Host / Mode 两键 + 发布 v1/v2/v3；Generic Host 进程内验证：
   - `AddAgileConfig(ConfigClientOptions)` 作为 IConfigurationProvider：`config["Db:Host"]`、`config["Mode"]` 可读，`group:key` → 分层键 ✓
   - `services.AddAgileConfig()`：DI 解析 `IConfigClient` 得到已连接的 ConfigClient（Status=Connected）✓
   - `Configure<DbOptions>(GetSection("Db"))` + `IOptionsMonitor<DbOptions>`：初值 ✓
   - **热更新**：运行中发布 v3 → 同秒 `[OnChange] Db:Host=v3-host`，`CurrentValue` 与 `IConfiguration["Db:Host"]` 同步翻转（transcript 第 07:31:33 行）✓
   - 附带发现：连接建立/全量重载也会触发 OnChange（首轮无值变化仍收到 OnChange）——已写进指南坑位
3. **控制台宿主 using 坑**：不加 `using Microsoft.AspNetCore.Hosting;` 时编译报「AddAgileConfig 没有采用 1 个参数的重载」（编译错误实测）——已写进指南警告框。

## 指南变更

第六节「依赖注入与 IConfiguration」（quick-start 与 csharp-sdk 之后）：AddAgileConfig 挂 IConfiguration（ASP.NET Core / Generic Host 两种形态）+ `AddAgileConfig()` DI 注册 + `Configure<T>`/`IOptionsMonitor<T>` 热更新 + 四条实测坑位。未实测的用法（无参重载/UseAgileConfig）仅一句话提及、标注"使用前请自行验证"。

## 门禁

vitest **118**（+1 DI 小节断言）/ e2e **37**（guide.spec 六节断言通过）/ build ✓。
