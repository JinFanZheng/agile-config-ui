import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router'
import { useAuthStore } from '../stores/auth'
import { useSettingsStore } from '../stores/settings'

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

/**
 * 已登录访问登录页 → 回跳目标。
 * 登录后的跳转收口在此（ITER-24）：此前 LoginPage 自行 navigate 与本守卫赛跑（守卫胜出把落地偏好打回 '/'）。
 * 优先级：合法 from 回跳 > 设置中心"登录后打开"偏好（overview=概览 / apps=应用）> 首页。
 */
export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token)
  const [searchParams] = useSearchParams()

  if (token) {
    const from = searchParams.get('from')
    if (from && from.startsWith('/') && !from.startsWith('/login')) {
      return <Navigate to={from} replace />
    }
    const landing = useSettingsStore.getState().defaultLandingPage
    return <Navigate to={landing === 'apps' ? '/apps' : '/'} replace />
  }
  return children
}
