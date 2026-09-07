export const clientsStr = {
  title: '客户端',
  subtitle: '嵌入了 AgileConfig.Client SDK 的业务服务实例，通过心跳上报状态',
  searchAppId: '按 AppId 过滤…',
  envAll: '全部环境',
  consistencyBanner: (n: number) =>
    `${n} 个客户端疑似未跟上最新版本（最后刷新时间早于最新发布时间）`,
  consistencyHint: '一致性按「最后刷新时间 vs 该应用最新发布时间」推断（服务端不提供客户端版本号）',
  table: {
    id: '客户端 ID',
    app: '应用',
    ip: 'IP',
    tag: '标签',
    env: '环境',
    heartbeat: '最后心跳',
    refresh: '最后刷新',
    consistency: '一致性',
    actions: '操作',
  },
  consistency: {
    synced: '已同步',
    stale: '疑似未更新',
    noPublish: '无发布',
  },
  actions: {
    reload: '重载配置',
    offline: '下线',
    reloadAll: '重载全部客户端',
    clearConfigCache: '清配置缓存',
    clearServiceCache: '清服务缓存',
  },
  confirm: {
    reloadTitle: '重载配置',
    reloadBody: (id: string) => `将通知客户端「${id}」立即重新拉取全部配置。确定继续？`,
    offlineTitle: '下线客户端',
    offlineBody: (id: string) =>
      `客户端「${id}」将断开连接并停止接收配置推送，直到其服务重启。确定下线？`,
    reloadAllTitle: '重载全部客户端',
    reloadAllBody: '将向所有在线客户端广播重载指令，每个客户端都会立即重新拉取配置。确定继续？',
    clearCacheTitle: '清除缓存',
    clearCacheBody: (name: string) =>
      `将清除服务端的「${name}」，会带来短暂的重复计算开销。确定继续？`,
  },
  empty: {
    title: '暂无在线客户端',
    hint: '运行嵌入了 AgileConfig.Client SDK 的业务服务后，其实例会出现在这里',
  },
  noMatch: '没有匹配的客户端',
  toasts: {
    reloaded: '已下发重载指令',
    offlined: '已下发下线指令',
    reloadAllDone: '已广播重载指令',
    cacheCleared: '缓存已清除',
    failed: '操作失败',
  },
} as const
