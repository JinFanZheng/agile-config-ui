import { apiGet, apiPost } from '../lib/http'

/** 发布时间线节点（PublishTimeline） */
export interface TimelineNode {
  id: string
  version: number
  log?: string
  publishTime?: string
  publishUserName?: string
  env?: string
}

/** 某版本的全量配置快照行（publish detail） */
export interface PublishDetail {
  configId?: string
  group: string
  key: string
  value: string
  description?: string
  version?: number
  publishTimelineId?: string
}

export interface PublishHistoryGroup {
  key: number
  timelineNode: TimelineNode | null
  list: PublishDetail[]
}

/** 发布历史（版本分组，服务端已按版本倒序） */
export function getPublishHistory(appId: string, env: string) {
  return apiGet<PublishHistoryGroup[]>('/Config/PublishHistory', { appId, env })
}

/** 发布：不传 ids = 全量；传 ids = 部分发布（2026-09-04 实测支持，handoff §12.4） */
export function publishConfigs(appId: string, env: string, log: string, ids?: string[]) {
  return apiPost<void>('/Config/Publish', { appId, log, ...(ids ? { ids } : {}) }, { env })
}

/** 回滚到指定时间线节点（生成新版本记录，不删历史） */
export function rollback(publishTimelineId: string, env: string) {
  return apiPost<void>('/Config/Rollback', undefined, { publishTimelineId, env })
}

/** 单条配置的发布历史 */
export interface ConfigPublishedItem {
  timelineNode: TimelineNode | null
  config: PublishDetail
}
export function getConfigPublishedHistory(configId: string, env: string) {
  return apiGet<ConfigPublishedItem[]>('/Config/ConfigPublishedHistory', { configId, env })
}
