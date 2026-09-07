import { useQueries, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { searchApps } from '../../api/apps'
import { getWaitPublishStatus } from '../../api/configs'
import { getPublishHistory } from '../../api/publish'
import { Input } from '../../components/ui/input'
import { Skeleton } from '../../components/ui/spinner'
import { cn } from '../../lib/utils'
import { useEnvStore } from '../../stores/env'
import { publishStr } from '../../strings/publish'

/** 应用域发布历史：已合并为配置页「历史」第四视图（北极星：发布链路不出页），此路由仅做兼容跳转 */
export function AppHistoryPage() {
  const { appId = '' } = useParams()
  return <Navigate to={`/apps/${appId}/config?view=history`} replace />
}

/** 全局发布历史入口：选择应用查看（侧栏「发布历史」目标页） */
export function HistoryIndexPage() {
  const env = useEnvStore((s) => s.currentEnv)
  const [keyword, setKeyword] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebounced(keyword.trim()), 300)
    return () => clearTimeout(t)
  }, [keyword])

  const apps = useQuery({
    queryKey: ['apps', 'search', { historyIndex: true, name: debounced, current: 1, pageSize: 50 }],
    queryFn: () => searchApps({ name: debounced || undefined, current: 1, pageSize: 50 }),
  })
  const list = apps.data?.data ?? []

  // 每应用并行拉最新版本与待发布计数（当前环境维度，staleTime 抑制重复请求）
  const pubQueries = useQueries({
    queries: list.map((a) => ({
      queryKey: ['publish', 'history', a.id, env, 'index'],
      queryFn: () => getPublishHistory(a.id, env),
      staleTime: 30_000,
    })),
  })
  const waitQueries = useQueries({
    queries: list.map((a) => ({
      queryKey: ['configs', 'waitPublish', a.id, env, 'index'],
      queryFn: () => getWaitPublishStatus(a.id, env),
      staleTime: 15_000,
    })),
  })

  const S = publishStr.historyIndex

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start gap-3">
        <div>
          <h1 className="text-base font-semibold">{publishStr.history.title}</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">{S.subtitle}</p>
        </div>
        <span className="ml-auto rounded-md border border-border bg-panel px-2 py-0.5 font-mono text-xs text-muted-foreground">
          {S.envHint(env)}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input
          className="w-full max-w-xs sm:w-auto"
          placeholder={S.searchPlaceholder}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <div className="ml-auto text-xs text-muted-foreground">共 {list.length} 个应用</div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-panel shadow-card">
        <table className="w-full min-w-[760px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-border bg-elevated text-left text-xs text-muted-foreground">
              <th className="px-4 py-2 font-medium whitespace-nowrap">{S.table.app}</th>
              <th className="w-[110px] px-4 py-2 font-medium whitespace-nowrap">{S.table.latest}</th>
              <th className="w-[160px] px-4 py-2 font-medium whitespace-nowrap">{S.table.lastPublish}</th>
              <th className="w-[100px] px-4 py-2 font-medium whitespace-nowrap">{S.table.publisher}</th>
              <th className="w-[130px] px-4 py-2 font-medium whitespace-nowrap">{S.table.pending}</th>
              <th className="w-[110px] px-4 py-2 text-right font-medium whitespace-nowrap">{S.table.actions}</th>
            </tr>
          </thead>
          <tbody>
            {apps.isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-border last:border-b-0">
                  <td colSpan={6} className="px-4 py-3">
                    <Skeleton className="h-4 w-full" />
                  </td>
                </tr>
              ))
            ) : list.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  {debounced ? S.noMatch : S.empty}
                </td>
              </tr>
            ) : (
              list.map((a, i) => {
                const latest = pubQueries[i]?.data?.[0]?.timelineNode
                const wp = waitQueries[i]?.data
                const pending = wp ? wp.addCount + wp.editCount + wp.deleteCount : 0
                return (
                  <tr key={a.id} className="border-b border-border transition-colors last:border-b-0 hover:bg-hover">
                    <td className="px-4 py-[7px]">
                      <Link to={`/apps/${a.id}/config?view=history`} className="font-medium hover:text-primary hover:underline">
                        {a.name}
                      </Link>
                      <span className="ml-2 font-mono text-xs text-muted-foreground">{a.id}</span>
                    </td>
                    <td className="px-4 py-[7px]">
                      {pubQueries[i]?.isLoading ? (
                        <Skeleton className="h-4 w-10" />
                      ) : latest ? (
                        <span className="rounded bg-elevated px-1.5 py-0.5 font-mono text-xs font-semibold">
                          {publishStr.history.version(latest.version)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/70">{S.noVersion}</span>
                      )}
                    </td>
                    <td className="px-4 py-[7px] whitespace-nowrap text-xs text-muted-foreground">
                      {latest?.publishTime ? latest.publishTime.slice(0, 19).replace('T', ' ') : '—'}
                    </td>
                    <td className="px-4 py-[7px] text-xs text-muted-foreground">{latest?.publishUserName ?? '—'}</td>
                    <td className="px-4 py-[7px]">
                      {waitQueries[i]?.isLoading ? (
                        <Skeleton className="h-4 w-16" />
                      ) : pending > 0 ? (
                        <span
                          className={cn(
                            'rounded-full bg-warning/10 px-2.5 py-0.5 font-mono text-[10px] text-warning',
                            wp!.deleteCount > 0 && 'bg-danger/10 text-danger'
                          )}
                          title={`${wp!.addCount} 新增 / ${wp!.editCount} 修改 / ${wp!.deleteCount} 删除`}
                        >
                          {S.pendingBadge(wp!.addCount, wp!.editCount, wp!.deleteCount)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-[7px] text-right">
                      <Link
                        to={`/apps/${a.id}/config?view=history`}
                        className="rounded px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
                      >
                        {S.viewHistory}
                      </Link>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
