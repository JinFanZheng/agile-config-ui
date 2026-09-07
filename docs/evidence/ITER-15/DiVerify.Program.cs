using AgileConfig.Client;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

var (appId, secret) = (args[0], args[1]);

var builder = Host.CreateDefaultBuilder(args)
    .ConfigureAppConfiguration((ctx, config) =>
    {
        config.AddAgileConfig(new ConfigClientOptions
        {
            AppId = appId,
            Secret = secret,
            Nodes = "http://localhost:5017",
            ENV = "DEV",
        });
    })
    .ConfigureServices((ctx, services) =>
    {
        services.AddAgileConfig(); // DI 注册（IConfigClient 等）
        services.Configure<DbOptions>(ctx.Configuration.GetSection("Db"));
        services.AddHostedService<Probe>();
    });

await builder.RunConsoleAsync();

class DbOptions { public string? Host { get; set; } }

class Probe(IOptionsMonitor<DbOptions> db, IConfigClient client, IConfiguration config) : IHostedService
{
    public Task StartAsync(CancellationToken ct)
    {
        db.OnChange((o, _) => Console.WriteLine($"[OnChange] Db:Host={o.Host} @{DateTime.Now:HH:mm:ss}"));
        Console.WriteLine($"[DI] IConfigClient 解析成功: {client.GetType().Name} Status={client.Status} Options.AppId={client.Options.AppId}");
        Console.WriteLine($"[IConfiguration] Db:Host={config["Db:Host"]} Mode={config["Mode"]}");
        Console.WriteLine($"[IOptionsMonitor] Db:Host={db.CurrentValue.Host}");
        _ = Loop(ct);
        return Task.CompletedTask;
    }

    private async Task Loop(CancellationToken ct)
    {
        for (var i = 1; i <= 10; i++)
        {
            await Task.Delay(2000, ct);
            Console.WriteLine(
                $"[{i}] Db:Host={db.CurrentValue.Host} | config Db:Host={config["Db:Host"]} | client.Get(Mode)={client.Get("Mode")} @{DateTime.Now:HH:mm:ss}"
            );
        }
        Console.WriteLine("DONE");
        Environment.Exit(0);
    }

    public Task StopAsync(CancellationToken ct) => Task.CompletedTask;
}
