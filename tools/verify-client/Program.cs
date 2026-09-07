using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using AgileConfig.Client;
using AgileConfig.Client.RegisterCenter;
using Microsoft.Extensions.Logging.Abstractions;

// AgileConfig 配置中心 + 服务注册 端到端验证客户端：
//   1. 启动拉取全量配置并打印（验证 /api/config 拉取链路）
//   2. 订阅 ConfigChanged / ReLoaded 事件（验证 WebSocket 实时推送）
//   3. 每 2 秒打印哨兵配置值（验证改值→发布→免重启生效）
//   4. 持续在线心跳（验证服务端 /clients 在线列表）
//   5. 服务注册（验证 /services 服务发现页面有数据）
// 用法：dotnet run [-- <appId> <secret> <serverUrl> <env> <运行秒数> <服务名> <服务ID>]
var appId = args.Length > 0 ? args[0] : "csharp_demo";
var secret = args.Length > 1 ? args[1] : "REPLACE_ME";
var nodes = args.Length > 2 ? args[2] : "http://localhost:5017";
var env = args.Length > 3 ? args[3] : "DEV";
var runSeconds = args.Length > 4 ? int.Parse(args[4]) : 60;
var serviceName = args.Length > 5 ? args[5] : "verify-client";
var serviceId = args.Length > 6 ? args[6] : $"verify_{Environment.MachineName}_{DateTime.Now:HHmmss}";

Console.WriteLine($"== AgileConfig 客户端验证（配置 + 服务注册）==");
Console.WriteLine($"appId={appId} nodes={nodes} env={env} 运行 {runSeconds}s");
Console.WriteLine($"服务注册: serviceName={serviceName} serviceId={serviceId}");

var options = new ConfigClientOptions
{
    AppId = appId,
    Secret = secret,
    Nodes = nodes,
    ENV = env,
    RegisterInfo = new ServiceRegisterInfo
    {
        ServiceId = serviceId,
        ServiceName = serviceName,
        HeartBeatMode = "client",
    },
};

var client = new ConfigClient(options);

client.ConfigChanged += arg =>
    Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] <推送> 配置变更：action={arg.Action} key={arg.Key} 新值={client.Get(arg.Key)}");
client.ReLoaded += _ =>
    Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] <推送> 配置全量重载，共 {client.Data.Count} 条");

var connected = await client.ConnectAsync();
Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] ConnectAsync 返回：{connected}");

// 等待首轮配置就位
for (var i = 0; i < 20 && client.Data.Count == 0; i++) await Task.Delay(250);

Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] 拉取到 {client.Data.Count} 条配置：");
foreach (var kv in client.Data.OrderBy(x => x.Key))
    Console.WriteLine($"    {kv.Key} = {kv.Value}");

// 服务注册
var loggerFactory = NullLoggerFactory.Instance;
var registerService = new RegisterService(client, loggerFactory);
await registerService.RegisterAsync();
Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] 服务注册完成：{serviceName} ({serviceId})");
Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] → 到管理端「服务注册」页查看在线状态");

// 心跳 + 哨兵轮询
var sentinelKey = client.Data.Keys.FirstOrDefault(k => k.EndsWith("timeout_seconds")) ?? client.Data.Keys.FirstOrDefault();
using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(runSeconds));

Console.CancelKeyPress += async (_, e) =>
{
    e.Cancel = true;
    cts.Cancel();
    await registerService.UnRegisterAsync();
    Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] 已注销服务，退出。");
};

try
{
    while (!cts.IsCancellationRequested)
    {
        await Task.Delay(2000, cts.Token);
        if (sentinelKey != null)
            Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] 哨兵 {sentinelKey} = {client.Get(sentinelKey)}（在线心跳+服务注册心跳中）");
        else
            Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] 在线心跳+服务注册心跳中（无哨兵键）");
    }
}
catch (TaskCanceledException) { }

// 正常退出时注销服务
try { await registerService.UnRegisterAsync(); } catch { /* 超时退出时可能已断开 */ }
Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] 验证结束，服务已注销。");
