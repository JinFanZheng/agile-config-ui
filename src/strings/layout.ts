export const layoutStr = {
  nav: {
    overview: '概览',
    apps: '应用',
    publishHistory: '发布历史',
    clients: '客户端',
    nodes: '节点',
    users: '用户',
    logs: '系统日志',
  },
  env: {
    DEV: 'DEV',
    TEST: 'TEST',
    PROD: 'PROD',
  },
  userMenu: {
    changePassword: '修改密码',
  },
} as const

export const homeStr = {
  title: '概览',
  subtitle: '当前会话与后端连接信息',
  sessionCard: '当前会话',
  backendCard: '后端连接',
  appsCard: '应用',
  appsCount: (n: number) => `共 ${n} 个应用`,
  goApps: '进入应用管理',
  userName: '用户名',
  roles: '角色',
  functions: '权限码',
  functionsCount: (n: number) => `${n} 项权限码`,
  noRole: '无角色',
  sameOrigin: '同源部署（代理）',
  appsComingSoon: '应用管理将在 M1 里程碑提供',
} as const
