import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { getApp } from '../../api/apps'
import {
  getWaitPublishStatus,
  searchConfigs,
  type ConfigItem,
  type WaitPublishStatus,
} from '../../api/configs'

/** 一次拉全量（服务端内存分页，pageSize 仅校验 ≤0；千级数据实测见 ITER-04 性能证据） */
const FULL_PAGE = 1_000_000

export function useAppInfo(appId: string | undefined) {
  return useQuery({
    queryKey: ['apps', 'detail', appId],
    queryFn: () => getApp(appId!),
    enabled: !!appId,
    staleTime: 60_000,
  })
}

export function useConfigs(appId: string | undefined, env: string) {
  return useQuery({
    queryKey: ['configs', appId, env],
    queryFn: () => searchConfigs({ appId: appId!, env, current: 1, pageSize: FULL_PAGE }),
    enabled: !!appId,
  })
}

/** 继承的公共应用配置（合并视图数据源，待核实 #7 定案：前端组合） */
export function useInheritedConfigs(
  appId: string | undefined,
  env: string,
  appInheritIds: string[] | undefined,
  enabled: boolean
) {
  return useQuery({
    queryKey: ['configs', 'inherited', appId, env, appInheritIds?.join(',')],
    queryFn: async () => {
      const lists = await Promise.all(
        (appInheritIds ?? []).map((id) =>
          searchConfigs({ appId: id, env, current: 1, pageSize: FULL_PAGE })
        )
      )
      return lists
    },
    enabled: enabled && !!appId && (appInheritIds?.length ?? 0) > 0,
    staleTime: 30_000,
  })
}

/**
 * 合并视图：本应用覆盖优先；继承行只读并标注来源。
 * 返回行上的 inheritedFrom = 来源应用 id。
 */
export function mergeInherited(
  own: ConfigItem[],
  inherited: { appId: string; list: ConfigItem[] }[]
) {
  const ownKeys = new Set(own.map((c) => `${c.group}\u0000${c.key}`))
  const rows: (ConfigItem & { inheritedFrom?: string })[] = [...own]
  for (const { list } of inherited) {
    for (const c of list) {
      if (!ownKeys.has(`${c.group}\u0000${c.key}`)) rows.push({ ...c, inheritedFrom: c.appId })
    }
  }
  return rows
}

/** 待发布统计轮询（UX #2：10s；页面离开自动停止；有待发布时也触发列表失效提示） */
export function useWaitPublish(appId: string | undefined, env: string) {
  return useQuery<WaitPublishStatus>({
    queryKey: ['configs', 'waitPublish', appId, env],
    queryFn: () => getWaitPublishStatus(appId!, env),
    enabled: !!appId,
    refetchInterval: 10_000,
  })
}

/** 配置域失效快捷方式 */
export function useInvalidateConfigs() {
  const qc = useQueryClient()
  return (appId: string, env: string) =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['configs', appId, env] }),
      qc.invalidateQueries({ queryKey: ['configs', 'inherited', appId, env] }),
      qc.invalidateQueries({ queryKey: ['configs', 'waitPublish', appId, env] }),
    ])
}

/** 分组排序键：空分组（未分组）排最后 */
export function groupSortKey(g: string) {
  return g === '' ? '\uffff' : g
}

export function useGroupedRows(rows: { group: string }[], collapsed: Set<string>) {
  return useMemo(() => {
    const groups = new Map<string, number>()
    for (const r of rows) groups.set(r.group, (groups.get(r.group) ?? 0) + 1)
    const sorted = [...groups.keys()].sort((a, b) => groupSortKey(a).localeCompare(groupSortKey(b)))
    const result: (
      { kind: 'group'; group: string; count: number } | { kind: 'row'; index: number }
    )[] = []
    sorted.forEach((g) => {
      result.push({ kind: 'group', group: g, count: groups.get(g)! })
      if (!collapsed.has(g)) {
        rows.forEach((r, i) => {
          if (r.group === g) result.push({ kind: 'row', index: i })
        })
      }
    })
    return result
  }, [rows, collapsed])
}
