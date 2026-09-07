/** 概览仪表页文案（ITER-06，仅中文，见 handoff §9） */
export const overviewStr = {
  title: '概览',
  subtitle: '实例运行状态与当前会话信息',
  stats: {
    apps: '启用应用',
    configs: '配置',
    nodes: '节点',
    services: '服务注册',
    servicesHint: '在线 / 注册总数',
    autoRefreshHint: '每 60 秒自动刷新',
    refreshedAt: (time: string) => `刷新于 ${time}`,
  },
  sys: {
    title: '系统信息',
    version: '版本',
    sso: 'SSO 状态',
    ssoOn: '已开启',
    ssoOff: '未开启',
    envs: '环境清单',
  },
  session: {
    title: '当前会话',
    userName: '用户名',
    roles: '角色',
    noRole: '无角色',
    functions: '权限码',
    functionsCount: (n: number) => `${n} 项权限码`,
  },
  loadFailed: '加载失败',
} as const
