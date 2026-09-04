import { apiGet, apiGetPage, apiPost, type Params } from '../lib/http'

/** 应用实体（Search 返回行；Get 返回含 secret） */
export interface AppItem {
  id: string
  name: string
  group?: string
  enabled: boolean
  /** 是否作为公共（被继承）应用 */
  inheritanced: boolean
  /** 本应用继承的应用 id 列表 */
  inheritancedApps?: string[]
  /** 继承的应用名列表（服务端冗余返回） */
  inheritancedAppNames?: string[]
  secret?: string
  createTime?: string
  updateTime?: string
}

/** 新建/编辑提交体（AppVM） */
export interface AppInput {
  id: string
  name: string
  group: string
  enabled: boolean
  inheritanced: boolean
  inheritancedApps: string[]
}

export interface AppSearchParams extends Params {
  name?: string
  id?: string
  group?: string
  sortField?: string
  ascOrDesc?: string
  current?: number
  pageSize?: number
}

/** 应用搜索（handoff §5.3；tableGrouped 视图按需在列表页客户端分组） */
export function searchApps(params: AppSearchParams = {}) {
  return apiGetPage<AppItem>('/App/Search', params)
}

/** 应用详情（含 Secret） */
export function getApp(id: string) {
  return apiGet<AppItem>('/App/Get', { id })
}

/** 新建：⚠️ id 必填且服务端不生成，由前端自动生成（UX #6） */
export function addApp(app: AppInput) {
  return apiPost<AppItem>('/App/Add', app)
}

/** 编辑 */
export function editApp(app: AppInput) {
  return apiPost<AppItem>('/App/Edit', app)
}

/** 启用/禁用（互切） */
export function disableOrEnableApp(id: string) {
  return apiPost<void>('/App/DisableOrEnable', undefined, { id })
}

/** 删除（二次确认；E2E 数据纪律：只删自建应用） */
export function deleteApp(id: string) {
  return apiPost<void>('/App/Delete', undefined, { id })
}

/** 全部分组名（新建/编辑分组建议 + 列表过滤） */
export function getAppGroups() {
  return apiGet<string[]>('/App/GetAppGroups')
}

/** 可继承的公共应用列表（currentAppId 用于排除自身） */
export function getInheritancedApps(currentAppId?: string) {
  return apiGet<AppItem[]>('/App/InheritancedApps', { currentAppId })
}
