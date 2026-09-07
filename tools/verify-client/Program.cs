using System;
using System.Linq;
using System.Net;
using System.Threading;
using System.Threading.Tasks;
using AgileConfig.Client;
using AgileConfig.Client.RegisterCenter;
using Microsoft.Extensions.Logging.Abstractions;

// AgileConfig 配置中心 + 服务注册 + 服务发现 端到端验证客户端：
//   1. 配置拉取 + WebSocket 实时推送 + 行内 diff（已有功能）
//   2. 服务注册（三种心跳模式：client / server / none）
//   3. HTTP 健康端点（server 模式时服务端探活的 URL）
//   4. 服务发现（DiscoveryService 按服务名查在线实例）
// 用法：
//   dotnet run -- <appId> <secret> <serverUrl> <env> <运行秒数> [服务名] [服务ID] [心跳模式]
//   心跳模式: client（默认）| server（需本程序启动 HTTP 健康端点）| none
var appId = args.Length > 0 ? args[0] : "csharp_demo";
var secret = args.Length > 1 ? args[1] : "REPLACE_ME";
var nodes = args.Length > 2 ? args[2] : "http://localhost:5017";
var env = args.Length > 3 ? args[3] : "DEV";
var runSeconds = args.Length > 4 ? int.Parse(args[4]) : 60;
var serviceName = args.Length > 5 ? args[5] : "";
var serviceId = args.Length > 6 ? args[6] : "";
var hbMode = args.Length > 7 ? args[7] : "client"; // client | server | none

var hasService = !string.IsNullOrEmpty(serviceName);
if (hasService && string.IsNullOrEmpty(serviceId))
    serviceId = $"{serviceName}_{Environment.MachineName}_{DateTime.Now:HHmmss}";

// server 模式时启动 HTTP 健康端点
HttpListener? healthServer = null;
var healthPort = 0;
if (hbMode == "server")
{
    healthPort = new Random().Next(15000, 16000);
    healthServer = new HttpListener();
    healthServer.Prefixes.Add($"http://+:{healthPort}/health/");
    healthServer.Start();
    _ = Task.Run(async () =>
    {
        while (healthServer.IsListening)
        {
            var ctx = await healthServer.GetContextAsync();
            var resp = ctx.Response;
            var buf = System.Text.Encoding.UTF8.GetBytes("{\"status\":\"UP\"}");
            resp.ContentType = "application/json";
            resp.OutputStream.Write(buf, 0, buf.Length);
            resp.Close();
        }
    });
    Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] HTTP 健康端点: http://localhost:{healthPort}/health/");
}

Console.WriteLine($"== AgileConfig 客户端验证（配置 + 服务注册 + 服务发现）==");
Console.WriteLine($"appId={appId} nodes={nodes} env={env} 运行 {runSeconds}s");
if (hasService)
    Console.WriteLine($"服务注册: {serviceName} ({serviceId}) 心跳模式={hbMode}" + (hbMode == "server" ? $" CheckUrl=http://localhost:{healthPort}/health/" : ""));

var options = new ConfigClientOptions
{
    AppId = appId,
    Secret = secret,
    Nodes = nodes,
    ENV = env,
};
if (hasService)
{
    options.RegisterInfo = new ServiceRegisterInfo
    {
        ServiceId = serviceId,
        ServiceName = serviceName,
        HeartBeatMode = hbMode,
    };
    if (hbMode == "server")
        
    // CheckUrl 必须从 AgileConfig 容器内可达。默认用容器自身的 echo 端点（保证探活成功）；
    // 自定义端点通过第 9 个参数传入（需保证容器网络可达，host.docker.internal 在部分 Docker 不通）
    options.RegisterInfo.CheckUrl = args.Length > 8 ? args[8] : "http://localhost:5000/Home/Echo";
}

var client = new ConfigClient(options);

client.ConfigChanged += arg =>
    Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] <推送> 配置变更：{arg.Action} {arg.Key} → {client.Get(arg.Key)}");
client.ReLoaded += _ =>
    Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] <推送> 配置全量重载，共 {client.Data.Count} 条");

var connected = await client.ConnectAsync();
Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] ConnectAsync：{connected}");
for (var i = 0; i < 20 && client.Data.Count == 0; i++) await Task.Delay(250);
Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] 配置 {client.Data.Count} 条：");
foreach (var kv in client.Data.OrderBy(x => x.Key))
    Console.WriteLine($"    {kv.Key} = {kv.Value}");

// ---- 服务注册 ----
RegisterService? registerService = null;
if (hasService)
{
    var loggerFactory = NullLoggerFactory.Instance;
    registerService = new RegisterService(client, loggerFactory);
    await registerService.RegisterAsync();
    Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] ✓ 服务注册完成：{serviceName} ({serviceId}) 心跳={hbMode}");
}

// ---- 服务发现 ----
if (hasService)
{
    try
    {
        await Task.Delay(2000);
        var discovery = client.DiscoveryService();
        if (discovery != null)
        {
            await discovery.RefreshAsync();
            var services = discovery.Services?.Where(s => s?.ServiceName == serviceName).ToList() ?? new();
            Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] ✓ 服务发现「{serviceName}」→ {services.Count} 个实例");
            foreach (var svc in services)
                Console.WriteLine($"    {svc?.ServiceId} @ {svc?.Ip}:{svc?.Port}");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] 服务发现异常（不影响配置验证）：{ex.GetType().Name}: {ex.Message}");
    }
}

// ---- 心跳循环 ----
var sentinelKey = client.Data.Keys.FirstOrDefault(k => k.EndsWith("timeout_seconds")) ?? client.Data.Keys.FirstOrDefault();
using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(runSeconds));

Console.CancelKeyPress += async (_, e) =>
{
    e.Cancel = true;
    cts.Cancel();
    if (registerService != null) await registerService.UnRegisterAsync();
    healthServer?.Stop();
    Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] 已注销+停止健康端点，退出。");
};

try
{
    while (!cts.IsCancellationRequested)
    {
        await Task.Delay(3000, cts.Token);
        var parts = new[] { "心跳中" };
        if (sentinelKey != null) parts = parts.Append($"{sentinelKey}={client.Get(sentinelKey)}").ToArray();
        if (hasService) parts = parts.Append($"服务心跳({hbMode})").ToArray();
        Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] {string.Join(" | ", parts)}");
    }
}

catch (TaskCanceledException) { }

try { if (registerService != null) await registerService.UnRegisterAsync(); } catch { }
healthServer?.Stop();
Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] 验证结束，服务已注销。");
