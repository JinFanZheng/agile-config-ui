import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuthStore } from '../stores/auth'

/** 未登录访问受保护路由 → 跳登录并记录来源，登录后回跳（handoff §9） */
export function RequireAuth() {
  const token = useAuthStore((s) => s.token)
  const location = useLocation()

  if (!token) {
    const from = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?from=${from}`} replace />
  }
  return <Outlet />
}

/** 已登录访问登录页 → 回首页 */
export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token)
  if (token) return <Navigate to="/" replace />
  return children
}
