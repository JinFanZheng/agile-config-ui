import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { History } from 'lucide-react'
import { useMemo, useState } from 'react'
import { getPublishHistory, rollback, type PublishHistoryGroup } from '../../api/publish'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Button } from '../../components/ui/button'
import { Skeleton } from '../../components/ui/spinner'
import { buildVersionDiff, type DiffRow } from '../../lib/diff'
import { usePermission } from '../../hooks/usePermission'
import { PERMISSION } from '../../lib/permissions'
import { ApiError } from '../../lib/http'
import { cn } from '../../lib/utils'
import { toast } from '../../stores/toast'
import { publishStr } from '../../strings/publish'
import { DiffTable } from './DiffTable'

const fmtTime = (t?: string) => (t ? t.slice(0, 19).replace('T', ' ') : '—')

/** 节点是否为该组的直接前驱（版本号小 1 的相邻版本） */
function prevOf(groups: PublishHistoryGroup[], node: PublishHistoryGroup) {
  const v = node.timelineNode?.version ?? node.key
  return groups.find((g) => (g.timelineNode?.version ?? g.key) === v - 1)
}

/**
 * 发布历史（UX #4，主从双栏布局）：
 * 左栏紧凑时间线，点击选择；右栏详情面板——单选显示该版本快照 + 与前版差异，
 * 再点第二个版本直接显示两版本 diff；回滚入口在详情底部（看清内容再操作）。
 */
export function HistoryPanel({ appId, env }: { appId: string; env: string }) {
  const queryClient = useQueryClient()
  const { can } = usePermission()
  /** 已点击的 timelineNode id（最多 2 个；再点第 3 个重置为该节点） */
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [rollbackTo, setRollbackTo] = useState<PublishHistoryGroup | null>(null)

  const history = useQuery({
    queryKey: ['publish', 'history', appId, env],
    queryFn: () => getPublishHistory(appId, env),
  })

  const rollbackMutation = useMutation({
    mutationFn: (timelineId: string) => rollback(timelineId, env),
    onSuccess: async () => {
      toast.success(publishStr.toasts.rolledBack(rollbackTo?.timelineNode?.version ?? ''))
      await queryClient.invalidateQueries({ queryKey: ['publish', 'history', appId, env] })
      await queryClient.invalidateQueries({ queryKey: ['configs', appId, env] })
      await queryClient.invalidateQueries({ queryKey: ['configs', 'waitPublish', appId, env] })
      setRollbackTo(null)
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : publishStr.toasts.failed),
  })

  const groups = useMemo(() => history.data ?? [], [history.data])

  if (history.isLoading) {
    return (
      <div className="flex-1 rounded-lg border border-border bg-panel p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="mb-3 h-14 w-full" />
        ))}
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-border bg-panel">
        <History className="mb-2 h-5 w-5 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">{publishStr.history.empty}</p>
      </div>
    )
  }

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 2) return [id]
      return [...prev, id]
    })
  }

  // 详情面板数据：0 选 → 最新版；1 选 → 该版详情；2 选 → 两版 diff
  const selectedGroups = selectedIds
    .map((id) => groups.find((g) => g.timelineNode?.id === id))
    .filter((g): g is PublishHistoryGroup => !!g)
  const sortedSel = [...selectedGroups].sort(
    (a, b) => (a.timelineNode?.version ?? 0) - (b.timelineNode?.version ?? 0)
  )
  const detail =
    selectedGroups.length === 2
      ? { kind: 'diff' as const, older: sortedSel[0], newer: sortedSel[1] }
      : { kind: 'single' as const, node: selectedGroups[0] ?? groups[0] }

  const diffRows: DiffRow[] =
    detail.kind === 'diff'
      ? buildVersionDiff(detail.older.list ?? [], detail.newer.list ?? [])
      : buildVersionDiff(prevOf(groups, detail.node)?.list ?? [], detail.node.list ?? [])

  const node = detail.kind === 'single' ? detail.node : null
  const prev = node ? prevOf(groups, node) : undefined
  const isLatest = node ? groups[0] === node : false
  const snapshot = node
    ? [...(node.list ?? [])].sort((a, b) => a.group.localeCompare(b.group) || a.key.localeCompare(b.key))
    : []

  return (
    <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-[minmax(300px,340px)_1fr]">
      {/* 左栏：紧凑时间线 */}
      <div className="flex min-h-0 flex-col rounded-lg border border-border bg-panel">
        <p className="border-b border-border px-4 py-2.5 text-xs text-muted-foreground">
          {publishStr.history.selectHint}
        </p>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {groups.map((g, idx) => {
            const id = g.timelineNode?.id ?? `idx-${idx}`
            const isSelected = selectedIds.includes(id)
            const latest = idx === 0
            return (
              <button
                key={id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => toggle(id)}
                className={cn(
                  'relative mb-0.5 w-full border-l-2 py-2 pl-4 pr-2 text-left transition-colors duration-150 ease-out',
                  isSelected
                    ? 'border-primary bg-elevated'
                    : latest
                      ? 'border-success/60 hover:bg-hover'
                      : 'border-border hover:bg-hover'
                )}
              >
                <span
                  className={cn(
                    'absolute top-3.5 -left-[4.5px] h-2 w-2 rounded-full border-2 border-panel',
                    isSelected ? 'bg-primary' : latest ? 'bg-success' : 'bg-muted-foreground/50'
                  )}
                />
                <span className="flex items-center gap-2">
                  <span className="shrink-0 rounded bg-elevated px-1.5 py-0.5 font-mono text-xs font-semibold text-foreground">
                    {publishStr.history.version(g.timelineNode?.version ?? g.key)}
                  </span>
                  <span className="min-w-0 truncate text-xs text-foreground">
                    {g.timelineNode?.log || publishStr.history.noLog}
                  </span>
                </span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  {g.timelineNode?.publishUserName ?? '—'} · {fmtTime(g.timelineNode?.publishTime)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 右栏：详情面板 */}
      <div className="flex min-h-0 flex-col rounded-lg border border-border bg-panel">
        {detail.kind === 'diff' ? (
          <>
            <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
              <span className="text-xs font-semibold text-foreground">
                {publishStr.history.compareTitle(
                  detail.older.timelineNode?.version ?? detail.older.key,
                  detail.newer.timelineNode?.version ?? detail.newer.key
                )}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                {detail.older.timelineNode?.log || publishStr.history.noLog} →{' '}
                {detail.newer.timelineNode?.log || publishStr.history.noLog}
              </span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <DiffTable rows={diffRows} />
            </div>
          </>
        ) : (
          <>
            <div className="border-b border-border px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-elevated px-1.5 py-0.5 font-mono text-xs font-semibold">
                  {publishStr.history.version(node!.timelineNode?.version ?? node!.key)}
                </span>
                <span className="min-w-0 flex-1 text-xs text-foreground">
                  {node!.timelineNode?.log || publishStr.history.noLog}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {node!.timelineNode?.publishUserName ?? '—'} · {fmtTime(node!.timelineNode?.publishTime)}
                </span>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {/* 与前版差异 */}
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                {prev
                  ? publishStr.history.changesVsPrev(prev.timelineNode?.version ?? prev.key)
                  : publishStr.history.firstVersion}
              </p>
              <div className="mb-4 max-h-64 overflow-y-auto rounded-lg border border-border">
                <DiffTable rows={diffRows} emptyText={publishStr.history.firstVersionEmpty} />
              </div>

              {/* 版本快照 */}
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                {publishStr.history.snapshot(snapshot.length)}
              </p>
              <div className="divide-y divide-border rounded-lg border border-border">
                {snapshot.map((c) => (
                  <div key={`${c.group}:${c.key}`} className="flex items-baseline gap-2 px-3 py-1.5 text-xs">
                    <span className="min-w-0 shrink-0 font-mono text-muted-foreground">
                      {c.group ? `${c.group}:${c.key}` : c.key}
                    </span>
                    <span className="min-w-0 flex-1 border-b border-dotted border-border/60" />
                    <span className="min-w-0 max-w-[60%] break-all font-mono text-foreground">{c.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 回滚：看清内容再操作（UX #4） */}
            <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-2.5">
              <span className="text-[11px] text-muted-foreground">
                {isLatest ? publishStr.history.rollbackLatestHint : publishStr.history.rollbackFooterHint}
              </span>
              {can(PERMISSION.ConfigOffline) && (
                <Button
                  size="sm"
                  variant="danger"
                  disabled={isLatest || rollbackMutation.isPending}
                  onClick={() => setRollbackTo(node!)}
                >
                  {publishStr.history.rollback}
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      {/* 回滚二次确认（明示目标版本） */}
      {rollbackTo?.timelineNode && (
        <ConfirmDialog
          open
          danger
          title={publishStr.confirm.rollbackTitle(rollbackTo.timelineNode.version)}
          body={publishStr.confirm.rollbackBody(
            rollbackTo.timelineNode.version,
            rollbackTo.timelineNode.log || publishStr.history.noLog
          )}
          confirmText={publishStr.confirm.rollbackConfirm}
          busy={rollbackMutation.isPending}
          onCancel={() => setRollbackTo(null)}
          onConfirm={() => rollbackMutation.mutate(rollbackTo.timelineNode!.id)}
        />
      )}
    </div>
  )
}
