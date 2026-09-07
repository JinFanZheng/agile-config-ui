import { http, apiPost, apiGet, ApiError } from '../lib/http'

/*
 * 导入导出域（ITER-08，形状以 1.13.2 源码为准）：
 * - App/Export 与 Config/ExportJson 返回**文件下载**（blob），需走 blob 解析
 * - App/PreviewImport 与 Config/PreViewJsonFile 为 form-data 文件上传
 * - Preview 返回 success=false 时 data 可能仍带部分信息，message 为首个错误
 */

function downloadBlob(res: Response, fallbackName: string) {
  const dispo = res.headers.get('content-disposition') ?? ''
  const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(dispo)
  return { blob: res.blob(), fileName: m?.[1] ?? fallbackName }
}

async function saveResponseFile(res: Response, fallbackName: string) {
  const { blob, fileName } = downloadBlob(res, fallbackName)
  const url = URL.createObjectURL(await blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

/** 应用导出：POST {appIds} → 下载 json 文件（含各环境配置全量） */
export async function exportApps(appIds: string[]) {
  const res = await http.post('/App/Export', { json: { appIds } })
  if (!res.ok) throw new ApiError(`导出失败（HTTP ${res.status}）`, res.status)
  await saveResponseFile(res, `agileconfig-export.json`)
}

export interface AppImportPreviewItem {
  appId: string
  name: string
  group?: string
  enabled: boolean
  /** 导入动作：create 新建 / update 覆盖已有 */
  action?: string
  configCount?: number
  envs?: Record<string, number>
}

export interface AppImportPreview {
  apps: AppImportPreviewItem[]
  errors: string[]
}

/** 应用导入预览：form-data 上传导出文件 → 校验结果（不落库） */
export async function previewAppImport(file: File): Promise<AppImportPreview> {
  const form = new FormData()
  form.append('file', file)
  const env = await http.post('/App/PreviewImport', { body: form }).json<{
    success: boolean
    data?: AppImportPreview
    message?: string
  }>()
  if (!env.success) throw new ApiError(env.message || '文件校验失败')
  return env.data ?? { apps: [], errors: [] }
}

export interface AppExportFile {
  schemaVersion?: number
  exportedAt?: string
  apps: {
    app: {
      id: string
      name: string
      group?: string
      secret?: string
      enabled: boolean
      inheritanced: boolean
      inheritancedApps?: string[]
    }
    envs: Record<string, { group?: string; key: string; value: string; description?: string }[]>
  }[]
}

/** 应用导入：body={file: 导出文件内容} */
export async function importApps(file: File) {
  const text = await file.text()
  const parsed = JSON.parse(text) as AppExportFile
  return apiPost<void>('/App/Import', { file: parsed })
}

/** 配置 JSON 导出：GET → 下载 jsonc 文件（含描述注释） */
export async function exportConfigJson(appId: string, env: string) {
  const res = await http.get('/Config/ExportJson', { searchParams: { appId, env } })
  if (!res.ok) throw new ApiError(`导出失败（HTTP ${res.status}）`, res.status)
  await saveResponseFile(res, `${appId}-${env}.json`)
}

export interface JsonFilePreviewItem {
  id?: string
  group?: string
  key: string
  value: string
  description?: string
}

/** 配置 JSON 文件上传预览：层级 key 拆 group+key，注释入 description */
export async function previewConfigJsonFile(file: File): Promise<JsonFilePreviewItem[]> {
  const form = new FormData()
  form.append('file', file)
  const env = await http.post('/Config/PreViewJsonFile', { body: form }).json<{
    success: boolean
    data?: JsonFilePreviewItem[]
    message?: string
  }>()
  if (!env.success) throw new ApiError(env.message || 'JSON 文件解析失败')
  return env.data ?? []
}

/** 环境间同步：把 currentEnv 的配置复制到 toEnvs（同名覆盖） */
export function syncEnv(appId: string, currentEnv: string, toEnvs: string[]) {
  return apiPost<void>('/Config/SyncEnv', toEnvs, { appId, currentEnv })
}

/** SSO 登录地址（未开启 SSO 时服务端返回 400） */
export async function getSsoLoginUrl(): Promise<string | null> {
  try {
    return await apiGet<string>('/SSO/LoginUrl')
  } catch {
    return null
  }
}
