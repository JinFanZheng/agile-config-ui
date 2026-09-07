import { useAuthStore } from '../stores/auth'

/**
 * 按钮级权限（UX #9，fail-closed）：无权限码 = 隐藏入口。
 * 数据源为登录响应 currentFunctions（会话内不变）；真正鉴权在服务端 PermissionCheck。
 */
export function usePermission() {
  const functions = useAuthStore((s) => s.user?.functions ?? [])
  const can = (code: string) => functions.includes(code)
  return { can, functions }
}
