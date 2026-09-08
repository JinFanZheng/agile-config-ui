/**
 * ITER-10 接入指南：全部界面文案（仅中文）。
 * 代码示例本体在 src/features/guide/snippets.ts（代码不算文案）。
 * 文案中用反引号包裹的片段会被渲染为行内代码（纯文本分段，无 markdown/HTML 运行时）。
 */
export const guideStr = {
  title: '接入指南',
  subtitle:
    '从创建应用到客户端秒级生效的完整路径：C# SDK 接入（含依赖注入与 IConfiguration 集成）、服务注册与发现，以及实测验证过的格式与归一化行为。',

  /** 分节 id 与目录/标题文案（页面锚点与目录共用） */
  sections: {
    quickStart: { id: 'quick-start', label: '快速开始' },
    csharpSdk: { id: 'csharp-sdk', label: 'C# SDK 接入' },
    diIntegration: { id: 'di-integration', label: '依赖注入与 IConfiguration' },
    serviceRegister: { id: 'service-register', label: '服务注册与发现' },
    pitfalls: { id: 'pitfalls', label: '格式与归一化实测坑位' },
    faq: { id: 'faq', label: 'FAQ' },
  },

  tocLabel: '分节目录',

  code: {
    copy: '复制',
    copied: '已复制',
  },

  footnote:
    '本页「实测坑位」与 FAQ 结论基于 AgileConfig 1.13.2 实测验证；服务端升级后请以官方文档为准。想让 AI 编码助手帮你接入？把站点根的 /llms.txt（或全量 /llms-full.txt）交给它即可，与本页同源。',

  quickStart: {
    intro:
      '六步走完第一份配置的完整生命周期：建应用 → 客户端接入 → 改配置 → 发布 → 客户端秒级生效。',
    step1Title: '创建应用，拿到 AppId 与 Secret',
    step1Body: '在管理台「应用」页新建应用，记录应用 ID（AppId）与密钥（Secret）。',
    step1SecretWarn:
      'Secret 需要在新建/编辑应用时自行填写，服务端不会自动生成；留空的 Secret 会导致客户端连接失败且难以排查（实测）。同理，应用 ID 服务端也不生成（本管理台会自动生成并允许修改）。',
    step2Title: '安装客户端 SDK',
    step2Body: '客户端通过 AgileConfig.Client NuGet 包接入。',
    step3Title: '初始化客户端并连接',
    step3Body:
      'Options 四要素（`appId` / `secret` / `nodes` / `env`）就位后构造 `ConfigClient` 并 `ConnectAsync()`：连接成功后客户端拉取当前环境的全部配置，并与服务端保持 WebSocket 长连接。',
    step3Note:
      '`ConnectAsync()` 返回后配置未必立即可读，防御式写法是有界等待 `client.Data` 非空（示例最多等 5 秒）再消费。',
    step4Title: '添加配置',
    step4Body:
      '在应用的「配置」页新增配置（分组可选、键、值、描述），保存后进入「待发布」状态；也可以用 KV / JSON 视图批量编辑。',
    step5Title: '发布',
    step5Body:
      '待发布的改动（新增/修改/删除）必须「发布」后才会对客户端生效。发布前查看 diff 预览并填写发布说明，支持勾选部分条目按范围发布。',
    step6Title: '客户端秒级生效',
    step6Body:
      '发布后服务端通过 WebSocket 长连接推送变更，客户端免重启自动加载（实测约 1 秒内生效）。',
    step6ClientsNote:
      '在管理台「客户端」页看不到你的实例？客户端列表按「在线节点」聚合：需先注册客户端可达的节点地址，节点探活（约 30 秒）置为在线后客户端才会出现（实测）。',
  },

  csharpSdk: {
    intro:
      '以下示例基于 AgileConfig.Client（C# / .NET）。先认识 Options 四要素，再看客户端生命周期与两个推送事件。',
    optionsTitle: 'Options（ConfigClientOptions）',
    optionsHead: ['字段', '说明'] as const,
    optionsRows: [
      ['AppId', '应用唯一标识，「应用」页查看'],
      ['Secret', '应用密钥，创建/编辑应用时设置（服务端不自动生成）'],
      [
        'Nodes',
        'AgileConfig 节点地址，多个用逗号分隔；必须是「客户端进程」可达的地址，与管理台页面访问地址不一定相同',
      ],
      ['ENV', '环境（如 DEV / TEST / PROD），需与服务端配置的环境一致；一次连接只属于一个环境'],
    ] as const,
    nodesWarn:
      'Docker 部署时尤其注意网络视角：客户端跑在容器外还是容器内，决定了该填宿主机地址还是容器内地址（实测坑位，填错表现为连接失败）。',
    lifecycleTitle: 'ConfigClient 生命周期',
    lifecycleP1:
      '`new ConfigClient(options)` 构造客户端；`await client.ConnectAsync()` 发起连接并拉取配置，返回值指示连接是否成功。',
    lifecycleP2:
      '连接成功后即可读值：`client.Get(key)` 实时读取单个键；`client.Data` 是当前环境的全量键值集合（扁平键 → 字符串值）。',
    eventsTitle: '事件：ConfigChanged 与 ReLoaded',
    eventsP1:
      '`ConfigChanged`：单个键发生变更时触发，事件参数携带 `Action`（动作）与 `Key`（键名），适合记录日志或做局部响应。',
    eventsP2:
      '`ReLoaded`：客户端全量重载时触发，事件参数不携带键级信息——需要把 `client.Data` 当作权威全量状态重新处理。',
    defensiveTitle: 'ReLoaded 竞争的防御式写法',
    defensiveItems: [
      '运行期取值不做本地快照，每次实时 `client.Get(key)`——本地缓存在全量重载的窗口期容易读到旧值；',
      '必须维护本地缓存时，在 `ReLoaded` 里按 `client.Data` 整表重建后「整体替换引用」，不要在原对象上逐条增删，避免读写双方在重载窗口读到半新半旧的数据；',
      '两个事件同时订阅：`ConfigChanged` 处理增量、`ReLoaded` 处理全量，不要假设全量重载时每个键都会先触发 `ConfigChanged`。',
    ] as const,
    defensiveNote:
      '另一个就绪竞争：`ConnectAsync()` 成功后 `client.Data` 仍可能为空，消费前有界轮询等待（如最多 20 次 × 250ms），超时再降级处理（记日志 / 用本地默认值），不要无限阻塞启动。',
  },

  diIntegration: {
    intro:
      'ASP.NET Core / Generic Host 项目不必手动 `new ConfigClient`：SDK 自带 IConfiguration 集成与 DI 注册，配置变更直达 `IOptionsMonitor<T>` 热更新（以下均对本机 1.13.2 服务端 + AgileConfig.Client 1.9.1 实测验证）。',
    setupTitle: '把 AgileConfig 挂到 IConfiguration',
    setupBody:
      '`AddAgileConfig` 让 AgileConfig 成为一个标准 `IConfigurationProvider`：配置以「扁平键」进入 IConfiguration，`group:key` 天然映射为分层键（配置项 `Db:Host` → `GetSection("Db")` 的 `Host`），空分组的键是顶层键。',
    setupWarn:
      '控制台 Worker / Generic Host 项目需要显式 `using Microsoft.AspNetCore.Hosting;`——`AddAgileConfig` 的扩展方法恰好在 ASP.NET Core 的命名空间下（Web 项目天然可见，控制台项目会报「没有采用 N 个参数的重载」，实测踩过）。',
    diTitle: 'DI 注册与强类型 Options',
    diBody:
      '`services.AddAgileConfig()` 把 `IConfigClient` 注册进容器（解析得到已连接的客户端单例，连接由集成层管理）；强类型绑定走 `Configure<T>(configuration.GetSection(...))`，注入 `IOptionsMonitor<T>` 读最新值并可订阅变更。',
    factsTitle: '实测行为与坑位',
    factsItems: [
      '发布 → `IOptionsMonitor.OnChange` 触发实测秒级（WebSocket 推送）：发布与 OnChange 同秒，`CurrentValue` 与 `IConfiguration[key]` 同步翻转；',
      '`OnChange` 在连接建立 / 全量重载时也可能触发，不必然代表值变化——需要感知「真的变了」时在回调里自行比对值；',
      '`IConfigClient` 接口成员较窄：`Get(key)` / 索引器 / `GetGroup(group)` / `Data` / `ConfigChanged` / `ReLoaded`；`AppId`、`Env` 等元信息走 `client.Options`，不在接口属性上；',
      '包内另有读配置节的无参/委托重载与 `IHostBuilder.UseAgileConfig` 宿主扩展；本指南只写实测过的显式 Options 用法，其他重载使用前请自行验证。',
    ] as const,
  },

  serviceRegister: {
    intro:
      'AgileConfig 内置轻量服务注册中心（管理台「服务注册中心」页可查看与管理）。C# SDK 在配置客户端之上提供 `RegisterService`（注册与心跳）和 `DiscoveryService`（服务发现）。',
    registerInfoTitle: '注册信息（ServiceRegisterInfo）',
    registerInfoBody: '把 `ServiceRegisterInfo` 挂到 `ConfigClientOptions.RegisterInfo`，随客户端一起初始化：',
    modesTitle: '三种心跳模式（HeartBeatMode）',
    modesHead: ['模式', '行为'] as const,
    modesRows: [
      ['client', 'SDK 心跳（默认）。客户端进程内定期向服务端上报心跳，无需额外设施。'],
      [
        'server',
        'HTTP 探测。由 AgileConfig 服务端定时探测 `CheckUrl` 指定的健康端点，要求你的服务启动 HTTP 健康地址。',
      ],
      ['none', '不检查。注册后不做存活检查，实例状态由注册/注销调用显式维护。'],
    ] as const,
    checkUrlWarn:
      'server 模式的 `CheckUrl` 必须从「AgileConfig 服务端」可达：Docker 部署注意容器网络，`host.docker.internal` 在部分 Docker 环境不通（实测注记）。健康端点示例返回 200 与 `{"status":"UP"}`。',
    regLifecycleTitle: '注册与注销',
    regLifecycleBody: '用同一个 `ConfigClient` 构造 `RegisterService`；进程退出前务必注销，避免实例残留：',
    regNote: '优雅退出（收到退出信号）与正常结束两条路径都要覆盖注销。',
    discoveryTitle: '服务发现（DiscoveryService）',
    discoveryBody:
      '通过 `client.DiscoveryService()` 获取发现组件，`RefreshAsync()` 刷新服务表，再按 `ServiceName` 过滤取实例的 `ServiceId` / `Ip` / `Port`：',
    discoveryNote: '从注册到可被发现有短暂延迟：示例在注册后等待约 2 秒再执行第一次发现。',
  },

  pitfalls: {
    intro:
      '以下均为对接 AgileConfig 1.13.2 的实测结论（曾用数百键规模的线上配置逐键比对通过）。核心认知：对客户端而言，配置永远是「扁平键值对」，JSON 只是管理端的呈现形式。',
    flatTitle: 'JSON 按冒号逐级嵌套',
    flatBody:
      'JSON 视图里的对象层级，在存储与客户端侧是「冒号拼接」的扁平键。客户端取值要用完整扁平键，拿不到分层对象：',
    flatHead: ['JSON（管理端视图）', '客户端读到的扁平键'] as const,
    flatRows: [
      ['{"app":{"timeout":"45"}}', 'app:timeout'],
      ['{"a":{"b":{"c":"v"}}}', 'a:b:c（多级逐级拼接）'],
      ['{"hosts":["a","b"]}', 'hosts:0、hosts:1（数组 = 数字索引键）'],
      ['{"plain":"x"}', 'plain（空分组键 = 裸键，无前导冒号）'],
    ] as const,
    arrayTitle: '数组 = 数字索引键',
    arrayBody:
      '`{"hosts":["a","b"]}` 存为 `hosts:0`、`hosts:1`；对象数组逐项展开为 `r:0:Action`。还原为 JSON 时，只有「从 0 开始且连续」的整数键会被视为数组；非 0 起始的整数键（如供应商 ID `1200`、`198`）保持对象形式，且保持文档顺序、不按数字大小重排（实测修复过的错位）。',
    normTitle: '字面量归一化',
    normBody:
      'JSON 字面量入库后被归一化为字符串，客户端读到的 value 永远是字符串；布尔与数字需要自行解析：',
    normHead: ['JSON 字面量', '客户端读到的 value'] as const,
    normRows: [
      ['true', '"True"'],
      ['false', '"False"'],
      ['null', '""（空字符串）'],
      ['42（数字）', '"42"（十进制文本）'],
    ] as const,
    groupTitle: '空分组键无前导冒号',
    groupBody:
      '没有分组的键就是裸 key（`plain`），不会带前导冒号（不是 `:plain`）。自行拼接 KV 文本与线上对比时务必遵循同一约定（与 `GetKvList` 返回一致），否则对比会错位。',
    editStatusTitle: 'EditStatus 真实枚举（对接管理 API 时）',
    editStatusBody:
      '配置行状态的真实枚举值：`EditStatus` 为 `Add=0 / Edit=1 / Deleted=2 / Commit=10`（10 = 已提交、无待发布改动）；`OnlineStatus` 为 `WaitPublish=0 / Online=1`。',
    editStatusWarn:
      '坑：编辑一条已上线配置会把该行的 onlineStatus 重置为 0。判断某行「是否已上线」一律以 editStatus 为准（已上线 = editStatus ≠ 0），不要用 onlineStatus。',
  },

  faq: {
    q1: 'Q1：补丁保存和全量保存有什么区别？',
    a1P1: 'JSON / KV 两个保存端点（`SaveJson` / `SaveKvList`）都带 `isPatch` 参数：',
    a1Patch: '补丁（isPatch=true）：只新增、更新提交内容里出现的键，不触碰其他配置。',
    a1Full:
      '全量（isPatch=false）：以提交内容为该应用的完整配置集合——现有配置中不在提交内容里的键会被标记为「待发布删除」，随下次发布真正删除。',
    a1Warn: '误用全量保存会把没动过的配置一起标记删除。批量编辑后先看 diff 预览确认删除项，再保存与发布。',
    q2: 'Q2：多环境如何隔离？',
    a2P1:
      '环境是配置的第一维度：同一应用在每个环境有独立的配置集、待发布状态与发布历史（管理端点都按 `env` 参数区分）。',
    a2P2:
      '客户端在 Options 的 `ENV` 指定要连接的环境，一次连接只属于一个环境。环境清单由服务端配置返回（管理台据其展示，缺省 DEV / TEST / PROD）。',
    q3: 'Q3：继承应用是什么？',
    a3P1: '应用可声明「继承」另一个（公共）应用来共享配置：新建/编辑应用时设置继承的应用列表。',
    a3P2:
      '服务端没有专用的合并查询端点；管理台按 `group+key` 自行组合：本应用的键覆盖继承应用的同名键，继承行只读并标注来源应用。',
    a3P3:
      '典型用法：把各业务应用都要的公共配置（日志级别、公共下游地址等）放进一个公共应用，各业务应用继承它，避免逐应用重复维护。',
  },
} as const
