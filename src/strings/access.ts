export const accessStr = {
  appAuth: {
    title: (appName: string) => `${appName} · 应用授权`,
    hint: '被授权用户才能管理该应用（服务端强制校验；未授权用户即使在应用列表看到也无法操作）',
    save: '保存授权',
    saving: '保存中…',
    usersEmpty: '没有可选用户',
    usersLoading: '加载中…',
    selected: (n: number) => `已选 ${n} 位用户`,
    toasts: { saved: '应用授权已保存', failed: '操作失败' },
  },
  changePassword: {
    title: '修改密码',
    old: '当前密码',
    oldPlaceholder: '输入当前密码',
    new: '新密码',
    newPlaceholder: '至少 6 位',
    confirm: '确认新密码',
    confirmPlaceholder: '再次输入新密码',
    submit: '修改密码',
    submitting: '修改中…',
    toasts: { saved: '密码已修改', failed: '操作失败' },
    errors: {
      oldRequired: '请输入当前密码',
      newMin: '新密码至少 6 位',
      mismatch: '两次输入的新密码不一致',
    },
  },
} as const
