export const logsStr = {
  title: '系统日志',
  subtitle: '服务端运行与操作日志流水，可用于审计与排障',
  searchPlaceholder: '按 AppId 过滤…',
  typeLabel: '日志类型',
  typeAll: '全部类型',
  count: (n: number) => `共 ${n} 条`,
  loadFailed: '加载失败',
  noMatchTitle: '没有匹配的日志',
  clearFilter: '清除筛选',
  emptyTitle: '暂无日志',
  table: {
    time: '时间',
    appId: 'AppId',
    type: '类型',
    text: '内容',
  },
  badges: {
    normal: '普通',
    warn: '警告',
  },
} as const
