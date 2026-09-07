import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { searchSysLogs, SysLogType } from '../../api/ops'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Skeleton } from '../../components/ui/spinner'
import { ApiError } from '../../lib/http'
import { S } from '../../strings/common'
import { logsStr } from '../../strings/logs'

const PAGE_SIZE = 20

/** logTime → YYYY-MM-DD HH:mm:ss */
function formatLogTime(t?: string | null) {
  if (!t) return '—'
  const s = t.replace('T', ' ')
  return s.length >= 19 ? s.slice(0, 19) : s
}

/** 系统日志：AppId + 类型过滤（防抖 300ms / 回车立即触发），分页浏览 */
export function LogsPage() {
  const [appIdInput, setAppIdInput] = useState('')
  const [appId, setAppId] = useState('')
  const [logType, setLogType] = useState('')
  const [page, setPage] = useState(1)

  // 搜索防抖 300ms（UX #7），清空关键词 = 清除过滤
  useEffect(() => {
    const t = setTimeout(() => {
      setAppId(appIdInput.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [appIdInput])

  const search = useQuery({
    queryKey: ['syslogs', 'search', { appId, logType, current: page, pageSize: PAGE_SIZE }],
    queryFn: () =>
      searchSysLogs({
        appId: appId || undefined,
        logType: logType === '' ? undefined : Number(logType),
        current: page,
        pageSize: PAGE_SIZE,
      }),
  })

  const rows = search.data?.data ?? []
  const total = search.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const hasFilter = appId !== '' || logType !== ''

  const clearFilter = () => {
    setAppIdInput('')
    setAppId('')
    setLogType('')
    setPage(1)
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start gap-3">
        <div>
          <h1 className="text-base font-semibold">{logsStr.title}</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">{logsStr.subtitle}</p>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input
          className="w-full max-w-xs sm:w-auto"
          placeholder={logsStr.searchPlaceholder}
          value={appIdInput}
          onChange={(e) => setAppIdInput(e.target.value)}
          onKeyDown={(e) => {
            // 回车立即触发，绕过防抖等待
            if (e.key === 'Enter') {
              setAppId(appIdInput.trim())
              setPage(1)
            }
          }}
        />
        <select
          value={logType}
          onChange={(e) => {
            setLogType(e.target.value)
            setPage(1)
          }}
          className="h-8 rounded-md border border-border bg-input px-2 text-xs text-foreground outline-none focus-visible:border-primary"
          aria-label={logsStr.typeLabel}
        >
          <option value="">{logsStr.typeAll}</option>
          <option value={String(SysLogType.Normal)}>{logsStr.badges.normal}</option>
          <option value={String(SysLogType.Warn)}>{logsStr.badges.warn}</option>
        </select>
        <div className="ml-auto text-xs text-muted-foreground">{logsStr.count(total)}</div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-panel shadow-card">
        <table className="w-full min-w-[720px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-border bg-elevated text-left text-xs text-muted-foreground">
              <th className="w-[168px] px-4 py-2 font-medium whitespace-nowrap">{logsStr.table.time}</th>
              <th className="w-[200px] max-w-[220px] px-4 py-2 font-medium">{logsStr.table.appId}</th>
              <th className="w-[76px] px-4 py-2 font-medium whitespace-nowrap">{logsStr.table.type}</th>
              <th className="px-4 py-2 font-medium">{logsStr.table.text}</th>
            </tr>
          </thead>
          <tbody>
            {search.isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-border last:border-b-0">
                  <td colSpan={4} className="px-4 py-3">
                    <Skeleton className="h-4 w-full" />
                  </td>
                </tr>
              ))
            ) : search.isError ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center">
                  <p className="text-xs text-danger">
                    {search.error instanceof ApiError ? search.error.message : logsStr.loadFailed}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => search.refetch()}
                  >
                    {S.retry}
                  </Button>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center">
                  {hasFilter ? (
                    <>
                      <p className="text-sm text-muted-foreground">{logsStr.noMatchTitle}</p>
                      <Button size="sm" variant="outline" className="mt-3" onClick={clearFilter}>
                        {logsStr.clearFilter}
                      </Button>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">{logsStr.emptyTitle}</p>
                  )}
                </td>
              </tr>
            ) : (
              rows.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-border transition-colors last:border-b-0 hover:bg-hover"
                >
                  <td className="px-4 py-[7px] text-xs whitespace-nowrap text-muted-foreground">
                    {formatLogTime(log.logTime)}
                  </td>
                  <td className="max-w-[220px] px-4 py-[7px]">
                    <span className="block truncate font-mono text-xs" title={log.appId || undefined}>
                      {log.appId || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-[7px] whitespace-nowrap">
                    {log.logType === SysLogType.Warn ? (
                      <span className="rounded bg-warning/10 px-1.5 py-0.5 text-[10px] text-warning">
                        {logsStr.badges.warn}
                      </span>
                    ) : (
                      <span className="rounded bg-elevated px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {logsStr.badges.normal}
                      </span>
                    )}
                  </td>
                  <td className="max-w-0 w-full px-4 py-[7px] text-xs text-muted-foreground">
                    <span className="block truncate" title={log.logText || undefined}>
                      {log.logText || '—'}
                    </span>
                  </td>
                </tr>
              ))
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
                size="icon"
                variant="ghost"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
