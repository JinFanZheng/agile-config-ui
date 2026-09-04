/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API 基地址，留空 = 同源 */
  readonly VITE_API_BASE?: string
  /** 开发代理目标（AgileConfig 后端） */
  readonly VITE_BACKEND_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
