import ky from 'ky'
import { useAuthStore } from '../stores/auth'

/**
 * HTTP 薄封装（ky）：
 * - 统一注入 Bearer token
 * - 401 全局拦截：清会话 → 跳登录（记录来源路由），登录接口自身除外
 * - 解包 AgileConfig 通用信封 { success, message, data } 与分页响应
 * API 基地址走环境变量 VITE_API_BASE（留空 = 同源），禁止硬编码。
 */
export const API_BASE = import.meta.env.VITE_API_BASE || ''

/** 通用响应信封 */
export interface Envelope<T> {
  success: boolean
  message?: string
  data: T
}

/** Search 类接口的分页响应 */
export interface PageResult<T> {
  current: number
  pageSize: number
  total: number
  success: boolean
  message?: string
  data: T[]
}

export type ParamValue = string | number | boolean | undefined
export type Params = Record<string, ParamValue>

export class ApiError extends Error {
  /** HTTP 状态码（网络/HTTP 层错误时存在；信封 success:false 时可能没有） */
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** 信封解包：success:false 抛 ApiError（message 为服务端原文） */
export function unwrapEnvelope<T>(env: Envelope<T>): T {
  if (!env.success) throw new ApiError(env.message || '请求失败')
  return env.data
}

export function unwrapPage<T>(page: PageResult<T>): PageResult<T> {
  if (!page.success) throw new ApiError(page.message || '请求失败')
  return page
}

function cleanParams(params?: Params) {
  if (!params) return undefined
  const cleaned: Record<string, string | number | boolean> = {}
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') cleaned[k] = v
  }
  return cleaned
}

// 401 处理可注入，便于单测替换（默认：清会话 + 跳登录并记录来源路由）
type UnauthorizedHandler = (from: string) => void
let onUnauthorized: UnauthorizedHandler = () => {
  useAuthStore.getState().clear()
  const from = window.location.pathname + window.location.search
  if (!window.location.pathname.startsWith('/login')) {
    window.location.assign(`/login?from=${encodeURIComponent(from)}`)
  }
}
export function setUnauthorizedHandler(fn: UnauthorizedHandler) {
  onUnauthorized = fn
}

function requestUrl(path: string) {
  // 有 prefixUrl 时 ky 要求相对路径；同源时用绝对路径避免相对解析歧义
  return API_BASE ? path.replace(/^\//, '') : path
}

export const http = ky.create({
  prefixUrl: API_BASE || undefined,
  timeout: 15_000,
  hooks: {
    beforeRequest: [
      (request) => {
        const token = useAuthStore.getState().token
        if (token) request.headers.set('Authorization', `Bearer ${token}`)
      },
    ],
    afterResponse: [
      (request, _options, response) => {
        if (response.status === 401 && !request.url.includes('/admin/jwt/login')) {
          onUnauthorized(window.location.pathname + window.location.search)
        }
        return response
      },
    ],
  },
})

export async function apiGet<T>(path: string, params?: Params): Promise<T> {
  const env = await http
    .get(requestUrl(path), { searchParams: cleanParams(params) })
    .json<Envelope<T>>()
  return unwrapEnvelope(env)
}

export async function apiGetPage<T>(path: string, params?: Params): Promise<PageResult<T>> {
  const page = await http
    .get(requestUrl(path), { searchParams: cleanParams(params) })
    .json<PageResult<T>>()
  return unwrapPage(page)
}

export async function apiPost<T>(path: string, json?: unknown, params?: Params): Promise<T> {
  const env = await http
    .post(requestUrl(path), { json, searchParams: cleanParams(params) })
    .json<Envelope<T>>()
  return unwrapEnvelope(env)
}
