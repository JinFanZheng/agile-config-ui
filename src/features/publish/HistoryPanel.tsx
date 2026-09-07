import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { History } from 'lucide-react'
import { useState } from 'react'
import { getPublishHistory, rollback, type PublishHistoryGroup } from '../../api/publish'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Button } from '../../components/ui/button'
import { Modal } from '../../components/ui/modal'
import { Skeleton } from '../../components/ui/spinner'
import { buildVersionDiff, type DiffRow } from '../../lib/diff'
import { ApiError } from '../../lib/http'
import { cn } from '../../lib/utils'
import { toast } from '../../stores/toast'
import { publishStr } from '../../strings/publish'
import { DiffTable } from './DiffTable'

const fmtTime = (t?: string) => (t ? t.slice(0, 19).replace('T', ' ') : '—')

/** 发布历史时间线：版本节点 + 任选两版本 diff + 回滚（二次确认，UX #4） */
export function HistoryPanel({ appId, env }: { appId: string; env: string }) {
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<string[]>([]) // timelineNode ids，最多 2
  const [diffOpen, setDiffOpen] = useState(false)
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

  const groups = history.data ?? []
  const selectedGroups = groups.filter((g) => selected.includes(g.timelineNode?.id ?? ''))
  // 对比方向：selectedGroups 按 version 排序，older → newer
  const [olderG, newerG] = [...selectedGroups].sort(
    (a, b) => (a.timelineNode?.version ?? 0) - (b.timelineNode?.version ?? 0)
  )
  const diffRows: DiffRow[] =
    olderG && newerG ? buildVersionDiff(olderG.list ?? [], newerG.list ?? []) : []

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 2) return [prev[1], id]
      return [...prev, id]
    })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="text-xs text-muted-foreground">{publishStr.history.subtitle}</p>
        <div className="flex-1" />
        {selected.length === 2 && olderG?.timelineNode && newerG?.timelineNode && (
          <Button size="sm" onClick={() => setDiffOpen(true)}>
            {publishStr.history.compareBtn(
              olderG.timelineNode.version,
              newerG.timelineNode.version
            )}
          </Button>
        )}
        {selected.length > 0 && (
          <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
            清除选择
          </Button>
        )}
      </div>

      {history.isLoading ? (
        <div className="flex-1 rounded-lg border border-border bg-panel p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="mb-3 h-14 w-full" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-border bg-panel">
          <History className="mb-2 h-5 w-5 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">{publishStr.history.empty}</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto rounded-lg border border-border bg-panel px-4 py-3">
          <ol className="relative ml-2 border-l border-border">
            {groups.map((g, idx) => {
              const node = g.timelineNode
              const id = node?.id ?? `idx-${idx}`
              const isLatest = idx === 0
              const checked = selected.includes(id)
              return (
                <li key={id} className="relative pb-5 pl-6 last:pb-1">
                  <span
                    className={cn(
                      'absolute top-1.5 -left-[5px] h-2.5 w-2.5 rounded-full border-2 border-panel',
                      isLatest ? 'bg-success' : 'bg-muted-foreground/50'
                    )}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-elevated px-1.5 py-0.5 font-mono text-xs font-semibold text-foreground">
                      {publishStr.history.version(node?.version ?? g.key)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                      {node?.log || publishStr.history.noLog}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {node?.publishUserName ?? '—'} · {fmtTime(node?.publishTime)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-3">
                    <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        className="accent-primary"
                        checked={checked}
                        onChange={() => toggleSelect(id)}
                      />
                      {publishStr.history.compare}
                    </label>
                    {!isLatest ? (
                      <button
                        type="button"
                        className="text-xs text-muted-foreground transition-colors hover:text-danger"
                        onClick={() => setRollbackTo(g)}
                      >
                        {publishStr.history.rollback}
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">
                        {publishStr.history.rollbackLatestHint}
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      )}

      {/* 版本 diff 弹窗 */}
      <Modal
        open={diffOpen}
        onClose={() => setDiffOpen(false)}
        title={`版本对比：v${olderG?.timelineNode?.version} → v${newerG?.timelineNode?.version}`}
        width="max-w-2xl"
      >
        <div className="max-h-[60vh] overflow-y-auto">
          <DiffTable rows={diffRows} />
        </div>
      </Modal>

      {/* 回滚二次确认（UX #4：明示目标版本） */}
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
