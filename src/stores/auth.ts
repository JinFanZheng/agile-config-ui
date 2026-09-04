import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuthUser {
  userName: string
  /** 角色，登录响应 currentAuthority */
  roles: string[]
  /** 权限码，登录响应 currentFunctions，驱动按钮级权限 */
  functions: string[]
}

interface AuthSession {
  token: string
  user: AuthUser
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  setSession: (session: AuthSession) => void
  clear: () => void
}

/**
 * 会话存储：JWT 放 localStorage（内网工具的权衡，见 docs/AGENT_HANDOFF.md §9）。
 * 服务端状态一律走 TanStack Query，不进 store。
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setSession: ({ token, user }) => set({ token, user }),
      clear: () => set({ token: null, user: null }),
    }),
    { name: 'agile-config-ui.session' }
  )
)
