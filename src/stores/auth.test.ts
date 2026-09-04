import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from './auth'

describe('useAuthStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.getState().clear()
  })

  it('setSession 写入 token 与 user', () => {
    useAuthStore.getState().setSession({
      token: 'jwt-token',
      user: { userName: 'admin', roles: ['super_admin'], functions: ['Config_Add'] },
    })
    const s = useAuthStore.getState()
    expect(s.token).toBe('jwt-token')
    expect(s.user?.userName).toBe('admin')
  })

  it('clear 清空会话', () => {
    useAuthStore.getState().setSession({
      token: 'jwt-token',
      user: { userName: 'admin', roles: [], functions: [] },
    })
    useAuthStore.getState().clear()
    expect(useAuthStore.getState().token).toBeNull()
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('会话持久化到 localStorage（刷新可恢复）', () => {
    useAuthStore.getState().setSession({
      token: 'persisted-token',
      user: { userName: 'admin', roles: ['super_admin'], functions: [] },
    })
    const raw = localStorage.getItem('agile-config-ui.session')
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw!).state.token).toBe('persisted-token')
  })
})
