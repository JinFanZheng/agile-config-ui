export const publishStr = {
  dialog: {
    title: '发布确认',
    subtitle: '发布后客户端将即时收到以下变更',
    counts: {
      add: (n: number) => `新增 ${n}`,
      edit: (n: number) => `修改 ${n}`,
      del: (n: number) => `删除 ${n}`,
    },
    log: '发布说明',
    logPlaceholder: '例如：调整超时参数（必填，写入发布历史）',
    logRequired: '请填写发布说明',
    submit: (n: number) => `发布 ${n} 项变更`,
    submitting: '发布中…',
    empty: '当前没有待发布改动',
    refresh: '刷新预览',
    staleHint: '预览数据在打开时重新拉取，发布前若他人有改动以最新为准',
    partial: (sel: number, total: number) =>
      `部分发布：本次仅发布勾选的 ${sel}/${total} 项，未勾选项保持待发布`,
  },
  diff: {
    col: { key: '配置项', old: '旧值（线上）', new: '新值' },
    kinds: { added: '新增', changed: '修改', removed: '删除' },
    empty: '两个版本内容一致',
  },
  history: {
    title: '发布历史',
    subtitle: '每次发布生成一个版本节点；可对比任意两版本，可回滚',
    version: (v: number | string) => `v${v}`,
    noLog: '（无说明）',
    rollback: '回滚到此版本',
    rollbackLatestHint: '当前版本',
    compare: '对比',
    compareBtn: (a: number, b: number) => `对比 v${a} ↔ v${b}`,
    compareLimit: '最多选择两个版本对比',
    empty: '还没有发布记录',
    emptyAction: '去发布第一个版本',
    currentEnv: '当前环境',
  },
  confirm: {
    rollbackTitle: (v: number | string) => `回滚到 v${v}`,
    rollbackBody: (v: number | string, log: string) =>
      `当前配置将被 v${v}（${log}）的全量内容覆盖，并作为新版本记录；已发布历史不会丢失。确定回滚？`,
    rollbackConfirm: '确认回滚',
  },
  itemHistory: {
    title: (key: string) => `${key} · 发布历史`,
    value: '值',
    empty: '该配置还没有发布记录',
  },
  toasts: {
    published: '已发布',
    rolledBack: (v: number | string) => `已回滚到 v${v}`,
    failed: '操作失败',
  },
} as const
