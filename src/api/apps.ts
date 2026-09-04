import { apiGetPage, type Params } from '../lib/http'

export interface AppItem {
  id: string
  name: string
  group?: string
  enabled: boolean
  /** 是否为公共（被继承）应用 */
  inheritanced: boolean
  secret?: string
  createTime?: string
  updateTime?: string
}

export interface AppSearchParams extends Params {
  name?: string
  id?: string
  group?: string
  sortField?: string
  ascOrDesc?: string
  tableGrouped?: boolean
  current?: number
  pageSize?: number
}

/** 应用搜索（handoff §5.3） */
export function searchApps(params: AppSearchParams = {}) {
  return apiGetPage<AppItem>('/App/Search', params)
}
