import { useMutation, useQuery } from '@tanstack/react-query'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  allClientsAction,
  clearConfigServiceCache,
  clearServiceInfoCache,
  getPublishHistoryLatest,
  oneClientAction,
  searchClients,
  type ClientInfo,
} from '../../api/ops'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Skeleton } from '../../components/ui/spinner'
import { ApiError } from '../../lib/http'
import { cn } from '../../lib/utils'
import { toast } from '../../stores/toast'
import { clientsStr } from '../../strings/clients'

const PAGE_SIZE = 50

const ENV_CLS: Record<string, string> = {
  DEV: 'bg-env-dev',
  TEST: 'bg-env-test',
  PROD: 'bg-env-prod',
}

type Confirm =
  | { kind: 'reload'; client: ClientInfo }
  | { kind: 'offline'; client: ClientInfo }
  | { kind: 'reloadAll' }
  | { kind: 'clearConfigCache' }
  | { kind: 'clearServiceCache' }
  | null

const fmt = (t?: string | null) => (t ? t.slice(0, 19).replace('T', ' ') : '—')

/**
 * 客户端列表 + 一致性视图（UX #13 降级实现，待核实 #8 定案）：
 * 服务端 ClientInfo 无版本字段，以「最后刷新时间 vs 该应用最新发布时间」推断。
 */
export function ClientsPage() {
  const [keyword, setKeyword] = useState('')
  const [debounced, setDebounced] = useState('')
  const [env, setEnv] = useState('')
  const [page, setPage] = useState(1)
  const [confirm, setConfirm] = useState<Confirm>(null)

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(keyword.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [keyword])

  const search = useQuery({
    queryKey: ['ops', 'clients', { appId: debounced, env, current: page, pageSize: PAGE_SIZE }],
    queryFn: () =>
      searchClients({
        appId: debounced || undefined,
        env: env || undefined,
        current: page,
        pageSize: PAGE_SIZE,
      }),
    refetchInterval: 15_000,
  })

  const rows = useMemo(() => search.data?.data ?? [], [search.data])

  // 各应用（按 env）最新发布时间（一致性比对基准）
  const appEnvPairs = useMemo(
    () => [...new Set(rows.map((r) => `${r.appId}@${r.env}`))].sort(),
    [rows]
  )
  const latestPublish = useQuery({
    queryKey: ['ops', 'clients', 'latestPublish', appEnvPairs.join(',')],
    queryFn: async () => {
      const entries = await Promise.all(
        appEnvPairs.map(async (pair) => {
          const [appId, env] = pair.split('@')
          const node = await getPublishHistoryLatest(appId, env)
          return [pair, node?.publishTime ?? null] as const
        })
      )
      return new Map(entries)
    },
    enabled: appEnvPairs.length > 0,
  })

  const staleCount = useMemo(
    () =>
      rows.filter((r) => {
        const latest = latestPublish.data?.get(`${r.appId}@${r.env}`)
        if (!latest) return false
        return !r.lastRefreshTime || r.lastRefreshTime < latest
      }).length,
    [rows, latestPublish.data]
  )

  const act = useMutation({
    mutationFn: (a: { run: () => Promise<unknown>; ok: string }) =>
      a.run().then(() => toast.success(a.ok)),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : clientsStr.toasts.failed),
    onSuccess: () => setConfirm(null),
  })

  const total = search.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-3">
      <div className="flex flex-wrap items-start gap-3">
        <div>
          <h1 className="text-base font-semibold">{clientsStr.title}</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">{clientsStr.subtitle}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirm({ kind: 'clearServiceCache' })}
          >
            {clientsStr.actions.clearServiceCache}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirm({ kind: 'clearConfigCache' })}
          >
            {clientsStr.actions.clearConfigCache}
          </Button>
          <Button variant="danger" size="sm" onClick={() => setConfirm({ kind: 'reloadAll' })}>
            <RefreshCw className="h-3.5 w-3.5" />
            {clientsStr.actions.reloadAll}
          </Button>
        </div>
      </div>

      {staleCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-warning/50 bg-warning/5 px-4 py-2.5 text-xs text-warning">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {clientsStr.consistencyBanner(staleCount)}
          <span className="ml-auto hidden text-[11px] text-muted-foreground sm:inline">
            {clientsStr.consistencyHint}
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="w-full max-w-xs sm:w-auto"
          placeholder={clientsStr.searchAppId}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <select
          value={env}
          onChange={(e) => {
            setEnv(e.target.value)
            setPage(1)
          }}
          className="h-8 rounded-md border border-border bg-input px-2 text-xs text-foreground outline-none focus-visible:border-primary"
          aria-label="环境过滤"
        >
          <option value="">{clientsStr.envAll}</option>
          {['DEV', 'TEST', 'PROD'].map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
        <div className="ml-auto text-xs text-muted-foreground">共 {total} 个在线客户端</div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-panel shadow-card">
        <table className="w-full min-w-[880px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-border bg-elevated text-left text-xs text-muted-foreground">
              <th className="px-4 py-2 font-medium">{clientsStr.table.id}</th>
              <th className="px-4 py-2 font-medium">{clientsStr.table.app}</th>
              <th className="px-4 py-2 font-medium">{clientsStr.table.ip}</th>
              <th className="px-4 py-2 font-medium">{clientsStr.table.tag}</th>
              <th className="px-4 py-2 font-medium">{clientsStr.table.env}</th>
              <th className="px-4 py-2 font-medium">{clientsStr.table.heartbeat}</th>
              <th className="px-4 py-2 font-medium">{clientsStr.table.refresh}</th>
              <th className="px-4 py-2 font-medium">{clientsStr.table.consistency}</th>
              <th className="px-4 py-2 text-right font-medium">{clientsStr.table.actions}</th>
            </tr>
          </thead>
          <tbody>
            {search.isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-border last:border-b-0">
                  <td colSpan={9} className="px-4 py-3">
                    <Skeleton className="h-4 w-full" />
                  </td>
                </tr>
              ))
            ) : search.isError ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center">
                  <p className="text-xs text-danger">
                    {search.error instanceof ApiError
                      ? search.error.message
                      : clientsStr.toasts.failed}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => search.refetch()}
                  >
                    重试
                  </Button>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center">
                  {debounced || env ? (
                    <p className="text-sm text-muted-foreground">{clientsStr.noMatch}</p>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">{clientsStr.empty.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground/70">
                        {clientsStr.empty.hint}
                      </p>
                    </>
                  )}
                </td>
              </tr>
            ) : (
              rows.map((c) => {
                const latest = latestPublish.data?.get(`${c.appId}@${c.env}`)
                const noPublish = !latest
                const stale = !noPublish && (!c.lastRefreshTime || c.lastRefreshTime < latest)
                return (
                  <tr
                    key={c.id}
                    className="border-b border-border transition-colors last:border-b-0 hover:bg-hover"
                  >
                    <td className="px-4 py-[7px] font-mono text-xs">{c.id}</td>
                    <td className="px-4 py-[7px] font-mono text-xs">{c.appId}</td>
                    <td className="px-4 py-[7px] text-xs text-muted-foreground">{c.ip || '—'}</td>
                    <td className="px-4 py-[7px] text-xs text-muted-foreground">{c.tag || '—'}</td>
                    <td className="px-4 py-[7px]">
                      <span className="flex items-center gap-1.5 font-mono text-xs">
                        <span
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            ENV_CLS[c.env] ?? 'bg-muted-foreground'
                          )}
                        />
                        {c.env}
                      </span>
                    </td>
                    <td className="px-4 py-[7px] text-xs text-muted-foreground">
                      {fmt(c.lastHeartbeatTime)}
                    </td>
                    <td className="px-4 py-[7px] text-xs text-muted-foreground">
                      {fmt(c.lastRefreshTime)}
                    </td>
                    <td className="px-4 py-[7px]">
                      {noPublish ? (
                        <span className="rounded bg-input px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {clientsStr.consistency.noPublish}
                        </span>
                      ) : stale ? (
                        <span className="rounded bg-warning/10 px-1.5 py-0.5 text-[10px] text-warning">
                          {clientsStr.consistency.stale}
                        </span>
                      ) : (
                        <span className="rounded bg-success/10 px-1.5 py-0.5 text-[10px] text-success">
                          {clientsStr.consistency.synced}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-[7px] text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          className="rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-hover hover:text-foreground"
                          onClick={() => setConfirm({ kind: 'reload', client: c })}
                        >
                          {clientsStr.actions.reload}
                        </button>
                        <button
                          type="button"
                          className="rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-hover hover:text-danger"
                          onClick={() => setConfirm({ kind: 'offline', client: c })}
                        >
                          {clientsStr.actions.offline}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        {total > PAGE_SIZE && (
          <div className="flex items-center justify-end gap-3 border-t border-border px-4 py-2 text-xs text-muted-foreground">
            <span>
              {page} / {totalPages}
            </span>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                上一页
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                下一页
              </Button>
            </div>
          </div>
        )}
      </div>

      {confirm?.kind === 'reload' && (
        <ConfirmDialog
          open
          title={clientsStr.confirm.reloadTitle}
          body={clientsStr.confirm.reloadBody(confirm.client.id)}
          confirmText={clientsStr.actions.reload}
          busy={act.isPending}
          onCancel={() => setConfirm(null)}
          onConfirm={() =>
            act.mutate({
              run: () => oneClientAction(confirm.client.id, 'reload'),
              ok: clientsStr.toasts.reloaded,
            })
          }
        />
      )}
      {confirm?.kind === 'offline' && (
        <ConfirmDialog
          open
          danger
          title={clientsStr.confirm.offlineTitle}
          body={clientsStr.confirm.offlineBody(confirm.client.id)}
          confirmText={clientsStr.actions.offline}
          busy={act.isPending}
          onCancel={() => setConfirm(null)}
          onConfirm={() =>
            act.mutate({
              run: () => oneClientAction(confirm.client.id, 'offline'),
              ok: clientsStr.toasts.offlined,
            })
          }
        />
      )}
      {confirm?.kind === 'reloadAll' && (
        <ConfirmDialog
          open
          danger
          title={clientsStr.confirm.reloadAllTitle}
          body={clientsStr.confirm.reloadAllBody}
          confirmText={clientsStr.actions.reloadAll}
          busy={act.isPending}
          onCancel={() => setConfirm(null)}
          onConfirm={() =>
            act.mutate({
              run: () => allClientsAction('reload'),
              ok: clientsStr.toasts.reloadAllDone,
            })
          }
        />
      )}
      {(confirm?.kind === 'clearConfigCache' || confirm?.kind === 'clearServiceCache') && (
        <ConfirmDialog
          open
          danger
          title={clientsStr.confirm.clearCacheTitle}
          body={clientsStr.confirm.clearCacheBody(
            confirm.kind === 'clearConfigCache'
              ? clientsStr.actions.clearConfigCache
              : clientsStr.actions.clearServiceCache
          )}
          busy={act.isPending}
          onCancel={() => setConfirm(null)}
          onConfirm={() =>
            act.mutate({
              run:
                confirm.kind === 'clearConfigCache'
                  ? clearConfigServiceCache
                  : clearServiceInfoCache,
              ok: clientsStr.toasts.cacheCleared,
            })
          }
        />
      )}
    </div>
  )
}
