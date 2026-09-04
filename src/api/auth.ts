import { apiGet, apiPost, ApiError, http, unwrapEnvelope, type Envelope } from '../lib/http'
import { useAuthStore, type AuthUser } from '../stores/auth'

/** 首启检测：data=false 表示超管密码未初始化（公开接口，无需登录） */
export async function checkPasswordInited(): Promise<boolean> {
  const env = await http.get('/Admin/PasswordInited').json<Envelope<boolean>>()
  return unwrapEnvelope(env)
}

interface LoginResponse {
  status: 'ok' | 'error'
  token?: string
  type?: string
  currentAuthority?: string[]
  currentFunctions?: string[]
  message?: string
}

/** 登录成功返回完整会话；失败抛 ApiError（message 为服务端原文，如"密码错误"） */
export async function login(
  userName: string,
  password: string
): Promise<{ token: string; user: AuthUser }> {
  const res = await http
    .post('/admin/jwt/login', { json: { userName, password } })
    .json<LoginResponse>()
  if (res.status !== 'ok' || !res.token) {
    throw new ApiError(res.message || '登录失败')
  }
  return {
    token: res.token,
    user: {
      userName,
      roles: res.currentAuthority ?? [],
      functions: res.currentFunctions ?? [],
    },
  }
}

/** 首启初始化超管密码（handoff §5.1） */
export async function initPassword(password: string, confirmPassword: string): Promise<void> {
  await apiPost<void>('/Admin/InitPassword', { password, confirmPassword })
}

/** M5 用：修改密码（需登录） */
export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  await apiPost<void>('/Admin/ChangePassword', {
    oldPassword,
    newPassword,
    confirmPassword: newPassword,
  })
}

/** 登出即清本地会话（服务端 JWT 无注销端点） */
export function logout() {
  useAuthStore.getState().clear()
}

/** 探测用：确认凭证有效（供排障/测试） */
export async function pingAuthedApi(): Promise<boolean> {
  const data = await apiGet<boolean>('/Admin/PasswordInited')
  return data
}
