/** 全站通用文案（仅中文，不引入 i18n 框架，见 handoff §9） */
export const S = {
  appName: 'AgileConfig',
  tagline: '配置变更 · 可知 · 可控 · 可逆',
  confirm: '确定',
  cancel: '取消',
  retry: '重试',
  loading: '加载中…',
  logout: '退出登录',
  comingSoon: '后续里程碑提供',
  /** 路由级错误页（RouterErrorPage）：应用更新后的过期 chunk 自动恢复 + 兜底文案 */
  routeError: {
    updatedTitle: '应用已更新',
    updatedBody: '检测到新版本，正在自动加载…若未自动完成，请点击下方按钮刷新页面。',
    updatedAction: '刷新加载新版本',
    notFoundTitle: '页面不存在',
    notFoundBody: '访问的地址不存在或已被移除。',
    unexpectedTitle: '出现了一点问题',
    unexpectedBody: '页面加载遇到意外错误，刷新通常可以解决；问题持续出现时请查看服务端日志。',
    reload: '刷新页面',
    backHome: '返回首页',
  },
} as const
