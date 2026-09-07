import { apiGetPage, apiPost, type Params } from '../lib/http'

/*
 * 服务注册中心 API（ITER-08，3 端点，形状以 1.13.2 源码为准，见 handoff §5）。
 * Service/Search 为分页信封；Service/Add / Service/Remove 为 {success,data} 信封。
 */

/** 健康状态（ServiceStatusEnum: Unhealthy=0 / Healthy=1） */
export const ServiceStatus = { Unhealthy: 0, Healthy: 1 } as const

export interface ServiceItem {
  id: string
  serviceId: string
  serviceName: string
  ip?: string
  port?: number
  metaData?: string
  /** 0=Unhealthy / 1=Healthy */
  status: number
  registerTime?: string | null
  lastHeartBeat?: string | null
  /** 探活方式：url / tcp */
  heartBeatMode?: string
  checkUrl?: string
  alarmUrl?: string
}

export interface ServiceSearchParams extends Params {
  serviceName?: string
  serviceId?: string
  status?: number
  current?: number
  pageSize?: number
}

/** 服务分页搜索（信封分页） */
export function searchServices(params: ServiceSearchParams = {}) {
  return apiGetPage<ServiceItem>('/Service/Search', params)
}

/** 手动注册请求体（ServiceItem 子集，服务端生成 id/status/时间字段） */
export interface ServiceAddPayload {
  serviceId: string
  serviceName: string
  ip?: string
  port?: number
  metaData?: string
  checkUrl?: string
  alarmUrl?: string
  heartBeatMode?: string
}

/** 手动注册服务（UI 侧，SDK 注册不走此端点） */
export function addService(svc: ServiceAddPayload) {
  return apiPost<void>('/Service/Add', svc)
}

/** 按 id 移除服务（服务重新注册后才会恢复发现） */
export function removeService(id: string) {
  return apiPost<void>('/Service/Remove', undefined, { id })
}
