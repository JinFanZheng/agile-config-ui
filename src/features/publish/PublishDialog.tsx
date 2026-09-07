import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { publishConfigs } from '../../api/publish'
import { searchConfigs } from '../../api/configs'
import { getPublishHistory } from '../../api/publish'
import { Button } from '../../components/ui/button'
import { Modal } from '../../components/ui/modal'
import { Spinner } from '../../components/ui/spinner'
import { buildPendingDiff, type DiffRow } from '../../lib/diff'
import { ApiError } from '../../lib/http'
import { cn } from '../../lib/utils'
import { toast } from '../../stores/toast'
import { publishStr } from '../../strings/publish'

const FULL_PAGE = 1_000_000

/**
 * 发布确认弹窗（UX #3）：强制 diff 预览 + 发布说明必填 + 发布范围勾选
 * （ids 支持部分发布，2026-09-04 实测，handoff §12.4）。
 * 打开时重新拉取最新数据（UX #11：避免基于过期状态发布）。
 */
export function PublishDialog({
  open,
  appId,
  env,
  onDone,
}: {
  open: boolean
  appId: string
  env: string
  onDone: () => void
}) {
  const queryClient = useQueryClient()
  const [log, setLog] = useState('')
  const [error, setError] = useState<string | null>(null)
  /** 选中的行（group+key → row）；默认全选，勾掉即部分发布 */
  const [excluded, setExcluded] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (open) {
      setLog('')
      setError(null)
      setExcluded(new Set())
    }
  }, [open])

  const preview = useQuery({
    queryKey: ['publish', 'preview', appId, env, open],
    queryFn: async () => {
      const [page, history] = await Promise.all([
        searchConfigs({ appId, env, current: 1, pageSize: FULL_PAGE }),
        getPublishHistory(appId, env),
      ])
      return { rows: page.data, snapshot: history[0]?.list ?? [] }
    },
    enabled: open,
    staleTime: 0,
    gcTime: 0,
  })

  const diff: DiffRow[] = useMemo(
    () => (preview.data ? buildPendingDiff(preview.data.rows, preview.data.snapshot) : []),
    [preview.data]
  )
  const rowId = (r: DiffRow) => `${r.group}\u0000${r.key}`

  const selectedRows = useMemo(() => diff.filter((r) => !excluded.has(rowId(r))), [diff, excluded])
  const counts = {
    added: selectedRows.filter((d) => d.kind === 'added').length,
    changed: selectedRows.filter((d) => d.kind === 'changed').length,
    removed: selectedRows.filter((d) => d.kind === 'removed').length,
  }
  const isPartial = selectedRows.length > 0 && selectedRows.length < diff.length

  const mutation = useMutation({
    mutationFn: () => {
      // 全选 = 不带 ids 的全量发布（保持服务端语义）；部分勾选 = 按 ids 部分发布
      const ids = isPartial
        ? selectedRows
            .map((r) => preview.data!.rows.find((c) => c.group === r.group && c.key === r.key)?.id)
            .filter(Boolean)
        : undefined
      return publishConfigs(appId, env, log.trim(), ids as string[] | undefined)
    },
    onSuccess: async () => {
      toast.success(publishStr.toasts.published)
      await queryClient.invalidateQueries({ queryKey: ['configs', appId, env] })
      await queryClient.invalidateQueries({ queryKey: ['configs', 'waitPublish', appId, env] })
      await queryClient.invalidateQueries({ queryKey: ['publish', 'history', appId, env] })
      onDone()
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : publishStr.toasts.failed),
  })

  const canSubmit = selectedRows.length > 0 && log.trim().length > 0 && !mutation.isPending

  return (
    <Modal open={open} onClose={onDone} title={publishStr.dialog.title} width="max-w-2xl">
      <div className="flex flex-col gap-3">
        {error && (
          <div
            role="alert"
            className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger"
          >
            {error}
          </div>
        )}

        {preview.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
            <Spinner /> 正在拉取最新变更…
          </div>
        ) : diff.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            {publishStr.dialog.empty}
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">{publishStr.dialog.subtitle}</span>
              <span className="rounded-full bg-info/10 px-2.5 py-0.5 text-xs text-info">
                {publishStr.dialog.counts.add(counts.added)}
              </span>
              <span className="rounded-full bg-warning/10 px-2.5 py-0.5 text-xs text-warning">
                {publishStr.dialog.counts.edit(counts.changed)}
              </span>
              <span className="rounded-full bg-danger/10 px-2.5 py-0.5 text-xs text-danger">
                {publishStr.dialog.counts.del(counts.removed)}
              </span>
              <div className="flex-1" />
              <Button size="sm" variant="ghost" onClick={() => preview.refetch()}>
                {publishStr.dialog.refresh}
              </Button>
            </div>

            <div className="max-h-80 overflow-y-auto rounded-lg border border-border bg-panel">
              <div className="min-w-[560px]">
                <div className="sticky top-0 grid grid-cols-[28px_180px_1fr_1fr] gap-2 border-b border-border bg-elevated px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                  <input
                    type="checkbox"
                    aria-label="全选发布范围"
                    checked={selectedRows.length === diff.length}
                    onChange={(e) =>
                      setExcluded(e.target.checked ? new Set() : new Set(diff.map(rowId)))
                    }
                    className="accent-primary"
                  />
                  <span>{publishStr.diff.col.key}</span>
                  <span>{publishStr.diff.col.old}</span>
                  <span>{publishStr.diff.col.new}</span>
                </div>
                {diff.map((r) => {
                  const off = excluded.has(rowId(r))
                  return (
                    <button
                      type="button"
                      key={rowId(r) + r.kind}
                      onClick={() =>
                        setExcluded((prev) => {
                          const next = new Set(prev)
                          if (next.has(rowId(r))) next.delete(rowId(r))
                          else next.add(rowId(r))
                          return next
                        })
                      }
                      className={cn(
                        'grid w-full grid-cols-[28px_180px_1fr_1fr] items-start gap-2 border-b border-border px-3 py-1.5 text-left text-xs transition-colors',
                        r.kind === 'removed' && !off && 'bg-danger/5',
                        r.kind === 'added' && !off && 'bg-info/5',
                        off && 'opacity-40',
                        'hover:bg-hover'
                      )}
                    >
                      <input
                        type="checkbox"
                        tabIndex={-1}
                        readOnly
                        aria-label={`发布 ${r.key}`}
                        checked={!off}
                        className="mt-0.5 accent-primary pointer-events-none"
                      />
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span
                          className={cn(
                            'shrink-0 rounded px-1 py-0.5 text-[10px]',
                            r.kind === 'added' && 'bg-info/10 text-info',
                            r.kind === 'changed' && 'bg-warning/10 text-warning',
                            r.kind === 'removed' && 'bg-danger/10 text-danger'
                          )}
                        >
                          {publishStr.diff.kinds[r.kind]}
                        </span>
                        <span className="truncate font-mono">
                          {r.group ? `${r.group}:${r.key}` : r.key}
                        </span>
                      </span>
                      <span className="min-w-0 break-all font-mono text-muted-foreground">
                        {r.kind === 'removed' ? r.old : (r.old ?? '—')}
                      </span>
                      <span className="min-w-0 break-all font-mono text-foreground">
                        {r.kind === 'removed' ? '（删除）' : (r.new ?? '—')}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {publishStr.dialog.staleHint}
              {isPartial && ` · ${publishStr.dialog.partial(selectedRows.length, diff.length)}`}
            </p>
          </>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="publish-log" className="text-xs font-medium text-muted-foreground">
            {publishStr.dialog.log}
          </label>
          <textarea
            id="publish-log"
            rows={2}
            value={log}
            onChange={(e) => setLog(e.target.value)}
            placeholder={publishStr.dialog.logPlaceholder}
            className="w-full rounded-md border border-border bg-input px-2.5 py-2 text-xs text-foreground outline-none transition-colors duration-150 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
          />
          {diff.length > 0 && log.trim().length === 0 && (
            <p className="text-xs text-danger">{publishStr.dialog.logRequired}</p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onDone} disabled={mutation.isPending}>
            取消
          </Button>
          <Button disabled={!canSubmit} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Spinner />}
            {mutation.isPending
              ? publishStr.dialog.submitting
              : publishStr.dialog.submit(selectedRows.length)}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
