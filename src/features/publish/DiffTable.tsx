import type { DiffRow } from '../../lib/diff'
import { cn } from '../../lib/utils'
import { publishStr } from '../../strings/publish'

const KIND_CLS: Record<string, string> = {
  added: 'bg-info/10 text-info',
  changed: 'bg-warning/10 text-warning',
  removed: 'bg-danger/10 text-danger',
}

/** 双栏 diff 表（发布预览与版本对比共用）：语义色分 新增/修改/删除 */
export function DiffTable({ rows, emptyText }: { rows: DiffRow[]; emptyText?: string }) {
  if (rows.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-xs text-muted-foreground">
        {emptyText ?? publishStr.diff.empty}
      </p>
    )
  }
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        <div className="grid grid-cols-[180px_1fr_1fr] gap-2 border-b border-border bg-elevated px-3 py-2 text-left text-xs font-medium text-muted-foreground">
          <span>{publishStr.diff.col.key}</span>
          <span>{publishStr.diff.col.old}</span>
          <span>{publishStr.diff.col.new}</span>
        </div>
        {rows.map((r) => (
          <div
            key={`${r.group}:${r.key}:${r.kind}`}
            className={cn(
              'grid grid-cols-[180px_1fr_1fr] items-start gap-2 border-b border-border px-3 py-1.5 text-xs',
              r.kind === 'removed' && 'bg-danger/5',
              r.kind === 'added' && 'bg-info/5'
            )}
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <span className={cn('shrink-0 rounded px-1 py-0.5 text-[10px]', KIND_CLS[r.kind])}>
                {publishStr.diff.kinds[r.kind]}
              </span>
              <span className="truncate font-mono">{r.group ? `${r.group}:${r.key}` : r.key}</span>
            </span>
            <span className="min-w-0 break-all font-mono text-muted-foreground">
              {r.kind === 'removed' ? r.old : (r.old ?? '—')}
            </span>
            <span className="min-w-0 break-all font-mono text-foreground">
              {r.kind === 'removed' ? '（删除）' : (r.new ?? '—')}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
