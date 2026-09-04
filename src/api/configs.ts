import { apiGet, apiGetPage, apiPost, type PageResult, type Params } from '../lib/http'

/** 待发布改动方向（服务端 editStatus） */
export const EditStatus = {
  None: 0,
  Added: 1,
  Edited: 2,
  Deleted: 3,
} as const
export type EditStatusValue = (typeof EditStatus)[keyof typeof EditStatus]

/** 配置实体（ConfigVM，handoff §5.4 实测字段） */
export interface ConfigItem {
  id: string
  appId: string
  group: string
  key: string
  value: string
  description?: string
  env: string
  /** 0=禁用 1=启用（服务端 status） */
  status: number
  /** 当前线上版本状态：0=未上线 1=已上线 */
  onlineStatus: number
  /** 待发布改动方向：0 无 / 1 新增 / 2 编辑 / 3 删除 */
  editStatus: EditStatusValue
  createTime?: string
  updateTime?: string
}

export interface ConfigSearchParams extends Params {
  appId?: string
  env?: string
  group?: string
  key?: string
  onlineStatus?: number
  sortField?: string
  ascOrDesc?: string
  current?: number
  pageSize?: number
}

/** 分页搜索（服务端内存分页仅校验 pageSize≤0，可传大值一次拉全做虚拟滚动） */
export function searchConfigs(params: ConfigSearchParams) {
  return apiGetPage<ConfigItem>('/Config/Search', params)
}

/** 单条详情 */
export function getConfig(id: string, env: string) {
  return apiGet<ConfigItem>('/Config/Get', { id, env })
}

/** 新建 */
export function addConfig(config: Partial<ConfigItem>, env: string) {
  return apiPost<ConfigItem>('/Config/Add', config, { env })
}

/** 批量新建（group+key 重复会报错） */
export function addConfigsRange(list: Partial<ConfigItem>[], env: string) {
  return apiPost<ConfigItem[]>('/Config/AddRange', list, { env })
}

/** 编辑（并发为 last-write-wins：调用方须先比对 updateTime，见交互规范） */
export function editConfig(config: Partial<ConfigItem>, env: string) {
  return apiPost<ConfigItem>('/Config/Edit', config, { env })
}

/** 删除（软删除：已发布的进入待发布删除状态） */
export function deleteConfig(id: string, env: string) {
  return apiPost<void>('/Config/Delete', undefined, { id, env })
}

/** 批量删除 */
export function deleteConfigs(ids: string[], env: string) {
  return apiPost<void>('/Config/DeleteSome', ids, { env })
}

/** 取消单条未发布的改动（旧 UI 实测为 POST，handoff §5.2） */
export function cancelEdit(configId: string, env: string) {
  return apiPost<void>('/Config/CancelEdit', undefined, { configId, env })
}

/** 批量取消改动（POST body=ids） */
export function cancelEdits(ids: string[], env: string) {
  return apiPost<void>('/Config/CancelSomeEdit', ids, { env })
}

/** KV 文本视图 */
export function getKvList(appId: string, env: string) {
  return apiGet<string>('/Config/GetKvList', { appId, env })
}

/** JSON 视图（jsonc，含描述注释） */
export function getJson(appId: string, env: string) {
  return apiGet<string>('/Config/GetJson', { appId, env })
}

/** KV 保存（isPatch=true 只提交差异；字段名以 SaveKVListVM 为准：str） */
export function saveKvList(appId: string, env: string, kvText: string, isPatch: boolean) {
  return apiPost<void>('/Config/SaveKvList', { str: kvText, isPatch }, { appId, env })
}

/** JSON 保存（isPatch=true 只提交差异；SaveJsonVM：json） */
export function saveJson(appId: string, env: string, jsonText: string, isPatch: boolean) {
  return apiPost<void>('/Config/SaveJson', { json: jsonText, isPatch }, { appId, env })
}

/** 待发布统计（徽标数据源，UX #2） */
export interface WaitPublishStatus {
  addCount: number
  editCount: number
  deleteCount: number
}
export function getWaitPublishStatus(appId: string, env: string) {
  return apiGet<WaitPublishStatus>('/Config/WaitPublishStatus', { appId, env })
}

/** 分页响应类型再导出（页面使用） */
export type { PageResult }
