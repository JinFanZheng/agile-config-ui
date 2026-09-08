/**
 * SSO/OIDC 回调落地辅助（ITER-25）。
 *
 * 背景：AgileConfig 服务端拿到授权码后硬编码重定向到官方 UI 的 hash 路由
 * `<PathBase>/ui#/oidc/login?code=xxx`（SSOController.Index）。本前端部署在根路径
 * 且使用 BrowserRouter——/ui 会经 SPA fallback 落回本应用而 hash 被路由忽略，
 * 因此在应用挂载前（main.tsx）同步解析 hash 兑换，兼容该官方约定。
 */

/** 形如 `#/oidc/login?code=xxx`（或含其他 query）；不匹配返回 null */
export function parseOidcCallback(hash: string): string | null {
  if (!hash.startsWith('#/oidc/login')) return null
  const query = hash.split('?')[1] ?? ''
  const code = new URLSearchParams(query).get('code')
  return code && code.length > 0 ? code : null
}

/** 兑换完成后清理地址：去掉 /ui 路径与回调 hash，回到根路径（history API 不触发导航） */
export function cleanOidcCallbackUrl(): void {
  history.replaceState(null, '', '/')
}
