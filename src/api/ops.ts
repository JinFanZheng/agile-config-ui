import { apiGet, apiGetPage, apiPost, http, type PageResult, type Params } from '../lib/http'
import { getPublishHistory, type TimelineNode } from './publish'

/*
 * 运维域 API（ITER-06，22 端点，形状以 1.13.2 源码为准）。
 * ⚠️ 该域信封约定混杂：计数类与 Sys/Current/Clients 为裸 JSON（http 直取），
 * 列表/分页类为 {success,data} 信封（apiGet/apiGetPage）。
 */

// ---------- Home ----------

export interface SysInfo {
  appVer?: string
  passwordInited?: boolean
  /** 服务端配置的环境列表（待核实 #5 定案：环境可配置，驱动 EnvSwitcher） */
  envList?: string[]
  ssoEnabled?: boolean
  ssoButtonText?: string
}
/** 系统信息（裸 JSON，匿名可访问） */
export function getSys() {
  return http.get('/Home/Sys').json<SysInfo>()
}

export interface CurrentUserInfo {
  currentUser?: {
    userId?: string
    userName?: string
    currentAuthority?: string[]
    currentFunctions?: string[]
    currentCategories?: string[]
  }
}
/** 当前会话用户信息（裸 JSON；用于刷新会话权限） */
export function getCurrentUser() {
  return http.get('/Home/Current').json<CurrentUserInfo>()
}

// ---------- Report ----------

export interface ClientInfo {
  id: string
  appId: string
  address: string
  tag?: string
  name?: string
  ip?: string
  env: string
  lastHeartbeatTime?: string
  /** 客户端最近刷新配置时间（一致性视图降级信号，待核实 #8 定案：无版本号字段） */
  lastRefreshTime?: string | null
}

export interface ClientInfos {
  clientCount: number
  infos: ClientInfo[] | null
}

/** 全部在线客户端（裸 JSON） */
export function getClients() {
  return http.get('/Report/Clients').json<ClientInfos>()
}

export interface RemoteNodeStatusItem {
  n: { address: string; remark?: string; status: number; lastEchoTime?: string }
  server_status: ClientInfos | null
}
/** 各节点状态 + 各自客户端（裸 JSON 数组） */
export function getRemoteNodesStatus() {
  return http.get('/Report/RemoteNodesStatus').json<RemoteNodeStatusItem[]>()
}

export interface ClientSearchParams extends Params {
  address?: string
  appId?: string
  env?: string
  current?: number
  pageSize?: number
}
/** 客户端分页搜索（信封分页） */
export function searchClients(params: ClientSearchParams = {}) {
  return apiGetPage<ClientInfo>('/Report/SearchServerNodeClients', params)
}

/** 启用应用数（裸数字） */
export function getAppCount() {
  return http.get('/Report/AppCount').json<number>()
}
/** 启用配置数（裸数字） */
export function getConfigCount() {
  return http.get('/Report/ConfigCount').json<number>()
}
/** 节点数（裸数字） */
export function getNodeCount() {
  return http.get('/Report/NodeCount').json<number>()
}
export interface ServiceCountInfo {
  serviceCount: number
  serviceOnCount: number
}
/** 服务注册数（裸对象） */
export function getServiceCount() {
  return http.get('/Report/ServiceCount').json<ServiceCountInfo>()
}

// ---------- RemoteOP（客户端运维动作，module c = 配置中心） ----------

export type ClientAction = 'reload' | 'offline'

function wsAction(action: ClientAction) {
  return { module: 'c', action }
}

/** 广播：全部客户端 */
export function allClientsAction(action: ClientAction) {
  return apiPost<void>('/RemoteOP/AllClientsDoActionAsync', wsAction(action))
}
/** 广播：某应用+环境的客户端 */
export function appClientsAction(appId: string, env: string, action: ClientAction) {
  return apiPost<void>('/RemoteOP/AppClientsDoActionAsync', wsAction(action), { appId, env })
}
/** 单客户端指令 */
export function oneClientAction(clientId: string, action: ClientAction) {
  return apiPost<void>('/RemoteOP/OneClientDoActionAsync', wsAction(action), { clientId })
}
/** 清配置服务缓存 */
export function clearConfigServiceCache() {
  return apiPost<void>('/RemoteOP/ClearConfigServiceCache')
}
/** 清服务信息缓存 */
export function clearServiceInfoCache() {
  return apiPost<void>('/RemoteOP/ClearServiceInfoCache')
}

// ---------- RemoteServerProxy（经指定节点代理） ----------

export function proxyClientOffline(address: string, clientId: string) {
  return apiPost<void>('/RemoteServerProxy/Client_Offline', undefined, { address, clientId })
}
export function proxyAllClientsReload(address: string) {
  return apiPost<void>('/RemoteServerProxy/AllClients_Reload', undefined, { address })
}
export function proxyClientReload(address: string, clientId: string) {
  return apiPost<void>('/RemoteServerProxy/Client_Reload', undefined, { address, clientId })
}

/** 某应用在某环境的最新发布节点（一致性视图基准；无发布史返回 null） */
export async function getPublishHistoryLatest(
  appId: string,
  env: string
): Promise<TimelineNode | null> {
  const list = await getPublishHistory(appId, env)
  return list?.[0]?.timelineNode ?? null
}

// ---------- ServerNode（NodeStatus: Online=1 / Offline=0） ----------

export const NodeStatus = { Offline: 0, Online: 1 } as const

export interface ServerNodeItem {
  address: string
  remark?: string
  status: number
  lastEchoTime?: string | null
}

export function getAllNodes() {
  return apiGet<ServerNodeItem[]>('/ServerNode/All')
}
export function addNode(address: string, remark?: string) {
  return apiPost<ServerNodeItem>('/ServerNode/Add', { address, remark })
}
export function deleteNode(address: string) {
  return apiPost<void>('/ServerNode/Delete', { address })
}

// ---------- SysLog（SysLogType: Normal=0 / Warn=1） ----------

export const SysLogType = { Normal: 0, Warn: 1 } as const

export interface SysLogItem {
  id: string
  appId?: string
  logType: number
  logTime?: string | null
  logText?: string
}

export interface SysLogSearchParams extends Params {
  appId?: string
  logType?: number
  startTime?: string
  endTime?: string
  current?: number
  pageSize?: number
}
export function searchSysLogs(params: SysLogSearchParams = {}) {
  return apiGetPage<SysLogItem>('/SysLog/Search', params)
}

export type { PageResult }
