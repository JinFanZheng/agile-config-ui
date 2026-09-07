/**
 * 接入指南代码示例（ITER-10）。
 * 全部改写自 tools/verify-client/Program.cs（可运行的 C# 验证客户端），
 * 占位符统一：your-app-id / your-app-secret / http://your-node:5000 / http://your-service:15000 等，
 * 不包含任何真实地址与凭证。代码按纯文本渲染（CodeBlock），不经任何 markdown/HTML 转换。
 */
export const SNIPPETS = {
  install: 'dotnet add package AgileConfig.Client',

  /** 快速开始：完整最小链路（Options → 事件 → 连接 → 有界等待就绪 → 打印全部配置） */
  quickStart: `using System;
using System.Linq;
using System.Threading.Tasks;
using AgileConfig.Client;

var options = new ConfigClientOptions
{
    AppId = "your-app-id",            // 「应用」页的 AppId
    Secret = "your-app-secret",       // 创建应用时填写的 Secret
    Nodes = "http://your-node:5000",  // 客户端可达的节点地址，多节点逗号分隔
    ENV = "DEV",                      // 环境，需与服务端一致
};

var client = new ConfigClient(options);

client.ConfigChanged += arg =>
    Console.WriteLine($"配置变更：{arg.Action} {arg.Key} → {client.Get(arg.Key)}");
client.ReLoaded += _ =>
    Console.WriteLine($"配置全量重载，共 {client.Data.Count} 条");

var connected = await client.ConnectAsync();
Console.WriteLine($"ConnectAsync：{connected}");

// ConnectAsync 返回后配置未必立即可读：有界等待 Data 就绪（最多 20 × 250ms）
for (var i = 0; i < 20 && client.Data.Count == 0; i++) await Task.Delay(250);

foreach (var kv in client.Data.OrderBy(x => x.Key))
    Console.WriteLine($"{kv.Key} = {kv.Value}");
`,

  /** 生命周期：构造 → 连接 → 读值 */
  lifecycle: `var client = new ConfigClient(options);

var connected = await client.ConnectAsync();   // 连接并拉取配置，返回值指示是否成功

// 运行期读值：实时取单个键 / 全量键值集合
var timeout = client.Get("app:timeout");
var all = client.Data;                         // 扁平键 → 字符串值
`,

  /** 两个推送事件（改写自验证客户端） */
  events: `client.ConfigChanged += arg =>
    Console.WriteLine($"配置变更：{arg.Action} {arg.Key} → {client.Get(arg.Key)}");

client.ReLoaded += _ =>
    Console.WriteLine($"配置全量重载，共 {client.Data.Count} 条");
`,

  /** ReLoaded 竞争的防御式写法 */
  defensive: `// 1) 运行期取值：实时 client.Get，不缓存本地快照
var timeout = client.Get("app:timeout_seconds");

// 2) 必须本地缓存时：ReLoaded 里整表重建后「整体替换引用」
client.ReLoaded += _ =>
{
    // 重建新字典 → 一次性替换，避免读写双方在重载窗口读到半新半旧数据
    localSnapshot = client.Data.ToDictionary(x => x.Key, x => x.Value);
};

// 3) ConnectAsync 成功后 Data 仍可能为空：有界等待就绪再消费
for (var i = 0; i < 20 && client.Data.Count == 0; i++) await Task.Delay(250);
if (client.Data.Count == 0)
{
    // 超时降级：记日志 / 使用本地默认值，不要无限阻塞启动
}
`,

  /** 依赖注入集成：挂到 IConfiguration（实测于 Generic Host + ASP.NET Core 形态） */
  diSetup: `using AgileConfig.Client;
using Microsoft.AspNetCore.Hosting;  // AddAgileConfig 扩展所在的命名空间（控制台宿主需显式引入）

// ASP.NET Core（Program.cs）
builder.Configuration.AddAgileConfig(new ConfigClientOptions
{
    AppId = "your-app-id",
    Secret = "your-app-secret",
    Nodes = "http://your-node:5000",   // 客户端进程可达的节点地址
    ENV = "DEV",
});

// 控制台 Worker / Generic Host
var builder = Host.CreateDefaultBuilder(args);
builder.ConfigureAppConfiguration((ctx, config) =>
{
    config.AddAgileConfig(new ConfigClientOptions
    {
        AppId = "your-app-id",
        Secret = "your-app-secret",
        Nodes = "http://your-node:5000",
        ENV = "DEV",
    });
});
`,

  /** DI + IOptionsMonitor 热更新（发布后秒级，实测） */
  diOptions: `// 1) IConfigClient 进 DI 容器（连接由集成层管理，可直接注入）
builder.Services.AddAgileConfig();

// 2) 强类型绑定：group:key → 分层键
//    配置项 Db:Host → GetSection("Db") 的 Host；空分组的键（如 Mode）是顶层键
builder.Services.Configure<DbOptions>(builder.Configuration.GetSection("Db"));

public class DbOptions { public string Host { get; set; } = ""; }

// 3) 注入 IOptionsMonitor：CurrentValue 始终是最新值，可选订阅变更
public class OrderService(IOptionsMonitor<DbOptions> db)
{
    public string Host => db.CurrentValue.Host;   // 发布后自动读到新值（实测秒级）

    public void Watch() => db.OnChange((o, name) =>
        Console.WriteLine($"选项 {name} 变更：Host={o.Host}"));
}

// 也可直接注入 IConfigClient（Get / 索引器 / GetGroup / Data）
public class RawReader(IConfigClient client)
{
    public string? Mode => client.Get("Mode");
}
`,
  /** 服务注册：注册信息随 Options 一起设置 */
  registerInfo: `using AgileConfig.Client;
using AgileConfig.Client.RegisterCenter;
using Microsoft.Extensions.Logging.Abstractions;

var options = new ConfigClientOptions
{
    AppId = "your-app-id",
    Secret = "your-app-secret",
    Nodes = "http://your-node:5000",
    ENV = "DEV",
    RegisterInfo = new ServiceRegisterInfo
    {
        ServiceId = "my-service_instance-001",  // 实例唯一标识
        ServiceName = "my-service",             // 服务名（发现时按它查询）
        HeartBeatMode = "client",               // client | server | none
        // 仅 server 模式需要：服务端定时探测的健康检查地址
        // CheckUrl = "http://your-service:15000/health/",
    },
};
`,

  /** server 心跳模式的健康端点（最小实现，改写自验证客户端） */
  healthEndpoint: `using System.Net;

// server 心跳模式：启动一个返回 200 {"status":"UP"} 的健康端点
var health = new HttpListener();
health.Prefixes.Add("http://+:15000/health/");
health.Start();
_ = Task.Run(async () =>
{
    while (health.IsListening)
    {
        var ctx = await health.GetContextAsync();
        var buf = System.Text.Encoding.UTF8.GetBytes("{\\"status\\":\\"UP\\"}");
        ctx.Response.ContentType = "application/json";
        await ctx.Response.OutputStream.WriteAsync(buf);
        ctx.Response.Close();
    }
});
`,

  /** 注册与注销 */
  registerLifecycle: `var client = new ConfigClient(options);
await client.ConnectAsync();

var registerService = new RegisterService(client, NullLoggerFactory.Instance);
await registerService.RegisterAsync();          // 注册（心跳随之开始）

// 优雅退出（收到退出信号）时注销
Console.CancelKeyPress += async (_, e) =>
{
    e.Cancel = true;
    await registerService.UnRegisterAsync();
};

// …运行业务…

try { await registerService.UnRegisterAsync(); } catch { }   // 结束时兜底注销
`,

  /** 服务发现 */
  discovery: `using System.Linq;

// 注册到可发现有短暂延迟：等约 2 秒再查询
await Task.Delay(2000);

var discovery = client.DiscoveryService();
if (discovery != null)
{
    await discovery.RefreshAsync();
    var instances = discovery.Services?
        .Where(s => s?.ServiceName == "my-service").ToList() ?? new();
    foreach (var svc in instances)
        Console.WriteLine($"{svc?.ServiceId} @ {svc?.Ip}:{svc?.Port}");
}
`,

  /** JSON 视图 vs 客户端扁平键 */
  flatKeys: `// 管理端 JSON 视图…
{
  "app": { "timeout": "45" },
  "hosts": ["a", "b"],
  "plain": "x"
}

// …客户端读到的扁平键
// app:timeout = 45
// hosts:0     = a
// hosts:1     = b
// plain       = x（空分组 = 裸键）
`,
} as const
