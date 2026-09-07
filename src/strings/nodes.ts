export const nodesStr = {
  title: '节点管理',
  subtitle: '节点是服务端集群实例，平等共享数据库',
  add: '添加节点',
  count: (n: number) => `共 ${n} 个节点`,
  loadFailed: '加载失败',
  emptyTitle: '还没有节点',
  emptyAction: '添加第一个节点',
  table: {
    address: '地址',
    remark: '备注',
    status: '状态',
    lastEcho: '最后心跳',
    clientCount: '客户端数',
    actions: '操作',
  },
  badges: {
    online: '在线',
    offline: '离线',
  },
  actions: {
    reloadClients: '重载客户端',
    delete: '删除',
  },
  dialog: {
    title: '添加节点',
    address: '节点地址',
    addressPlaceholder: '例如：192.168.0.10:5000',
    remark: '备注',
    remarkPlaceholder: '例如：机房 A（可选）',
    submit: '添加',
    submitting: '添加中…',
  },
  confirm: {
    reloadTitle: '重载全部客户端',
    reloadBody: (address: string) =>
      `将通知节点 ${address} 上的全部在线客户端重新拉取配置。确定重载客户端？`,
    deleteTitle: '删除节点',
    deleteBody: (address: string) => `将从集群中移除节点 ${address}，此操作不可恢复。确定删除？`,
  },
  errors: {
    addressRequired: '请输入节点地址',
  },
  toasts: {
    added: (address: string) => `节点 ${address} 已添加`,
    deleted: (address: string) => `节点 ${address} 已删除`,
    reloaded: (address: string) => `已通知 ${address} 的全部客户端重载配置`,
    failed: '操作失败',
  },
} as const
