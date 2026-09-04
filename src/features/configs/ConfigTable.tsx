import { useVirtualizer } from '@tanstack/react-virtual'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useMemo, useRef, useState, type ReactNode } from 'react'
import type { ConfigItem } from '../../api/configs'
import { cn } from '../../lib/utils'
import { configsStr } from '../../strings/configs'
import { groupSortKey } from './useConfigs'

export type VirtualRow =
  | { kind: 'group'; group: string; count: number }
  | { kind: 'row'; index: number }

const GRID =
  'grid grid-cols-[28px_96px_210px_minmax(160px,1fr)_84px_84px_104px_auto] items-center'

const badgeCls = 'rounded px-1.5 py-0.5 text-[10px]'

/** 行级待发布态（真实枚举）：0=新增 1=修改 2=删除方向 10=无待发布 */
function EditStatusBadge({ item }: { item: ConfigItem }) {
  if (item.editStatus === 2)
    return <span className={`${badgeCls} bg-danger/10 text-danger`}>{configsStr.badges.deleted}</span>
  if (item.editStatus === 1)
    return <span className={`${badgeCls} bg-warning/10 text-warning`}>{configsStr.badges.edited}</span>
  if (item.editStatus === 0)
    return <span className={`${badgeCls} bg-info/10 text-info`}>{configsStr.badges.added}</span>
  return <span className="text-muted-foreground">—</span>
}

interface ConfigTableProps {
  rows: (ConfigItem & { inheritedFrom?: string })[]
  appNameOf: (appId: string) => string
  collapsed: Set<string>
  onToggleGroup: (group: string) => void
  selected: Set<string>
  onToggleSelect: (id: string) => void
  onToggleAll: () => void
  /** 行内快编（并发保护由上层处理） */
  onInlineSave: (item: ConfigItem, value: string) => Promise<void>
  onEdit: (item: ConfigItem) => void
  onDelete: (item: ConfigItem) => void
  onCancelEdit: (item: ConfigItem) => void
  onHistory: (item: ConfigItem) => void
  toolbar?: ReactNode
}

/** 配置表：虚拟滚动（千级数据 DOM 只渲染可视行）+ 分组折叠 + 多选 + 行内快编 value */
export function ConfigTable({
  rows,
  appNameOf,
  collapsed,
  onToggleGroup,
  selected,
  onToggleSelect,
  onToggleAll,
  onInlineSave,
  onEdit,
  onDelete,
  onCancelEdit,
  onHistory,
}: ConfigTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null)

  // 虚拟行模型：分组头 + 展开组的数据行
  const virtualRows = useMemo<VirtualRow[]>(() => {
    const groups = new Map<string, number>()
    for (const r of rows) groups.set(r.group, (groups.get(r.group) ?? 0) + 1)
    const sorted = [...groups.keys()].sort((a, b) => groupSortKey(a).localeCompare(groupSortKey(b)))
    const out: VirtualRow[] = []
    for (const g of sorted) {
      out.push({ kind: 'group', group: g, count: groups.get(g)! })
      if (!collapsed.has(g)) {
        rows.forEach((r, i) => {
          if (r.group === g) out.push({ kind: 'row', index: i })
        })
      }
    }
    return out
  }, [rows, collapsed])

  const virtualizer = useVirtualizer({
    count: virtualRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 34,
    overscan: 12,
  })

  const allVisibleSelected =
    rows.length > 0 && rows.every((r) => r.inheritedFrom || selected.has(r.id))

  const commitInline = async (item: ConfigItem) => {
    if (!editing || editing.id !== item.id) return
    const v = editing.value
    setEditing(null)
    if (v !== item.value) await onInlineSave(item, v)
  }

  return (
    <div
      ref={scrollRef}
      className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-panel shadow-card"
      data-testid="config-table"
    >
      <div className="min-w-[880px]">
        {/* 表头（sticky） */}
        <div
          className={cn(
            GRID,
            'sticky top-0 z-10 border-b border-border bg-elevated px-3 py-2 text-left text-xs font-medium text-muted-foreground'
          )}
        >
          <input
            type="checkbox"
            aria-label="全选"
            checked={allVisibleSelected}
            onChange={onToggleAll}
            className="accent-primary"
          />
          <span>{configsStr.table.group}</span>
          <span>{configsStr.table.key}</span>
          <span>{configsStr.table.value}</span>
          <span>{configsStr.table.online}</span>
          <span>{configsStr.table.pending}</span>
          <span>{configsStr.table.updateTime}</span>
          <span className="text-right">{configsStr.table.actions}</span>
        </div>

        {/* 虚拟行容器 */}
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map((v) => {
            const row = virtualRows[v.index]
            const style = {
              position: 'absolute' as const,
              top: 0,
              left: 0,
              width: '100%',
              height: v.size,
              transform: `translateY(${v.start}px)`,
            }

            if (row.kind === 'group') {
              const isCollapsed = collapsed.has(row.group)
              return (
                <div
                  key={`g-${row.group}-${v.key}`}
                  style={style}
                  className={cn(GRID, 'cursor-pointer border-b border-border bg-input/50 px-3 text-xs font-medium text-foreground')}
                  onClick={() => onToggleGroup(row.group)}
                >
                  <span className="col-span-8 flex items-center gap-1.5">
                    {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    <span className="font-mono">{row.group || '未分组'}</span>
                    <span className="font-normal text-muted-foreground">{row.count}</span>
                  </span>
                </div>
              )
            }

            const item = rows[row.index]
            const isInherited = !!item.inheritedFrom
            const isDeleting = item.editStatus === 2
            return (
              <div
                key={item.id + v.key}
                style={style}
                className={cn(
                  GRID,
                  'border-b border-border px-3 text-[13px] transition-colors',
                  isInherited ? 'bg-input/30' : 'hover:bg-hover',
                  isDeleting && 'opacity-60'
                )}
              >
                <input
                  type="checkbox"
                  disabled={isInherited}
                  aria-label={`选择 ${item.key}`}
                  checked={selected.has(item.id)}
                  onChange={() => onToggleSelect(item.id)}
                  className="accent-primary"
                />
                <span className="truncate font-mono text-xs text-muted-foreground">{item.group || '—'}</span>
                <span className="flex items-center gap-1.5 truncate font-mono text-xs">
                  <span className="truncate">{item.key}</span>
                  {isInherited && (
                    <span
                      title={configsStr.table.inheritedFrom(appNameOf(item.inheritedFrom!))}
                      className="shrink-0 rounded bg-info/10 px-1 py-0.5 text-[10px] text-info"
                    >
                      继承
                    </span>
                  )}
                </span>
                {/* 值：本应用行点击进入行内快编 */}
                {editing?.id === item.id ? (
                  <input
                    autoFocus
                    className="h-6 rounded border border-primary bg-input px-1.5 font-mono text-xs outline-none"
                    title={configsStr.inline.hint}
                    value={editing.value}
                    onChange={(e) => setEditing({ id: item.id, value: e.target.value })}
                    onBlur={() => commitInline(item)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitInline(item)
                      if (e.key === 'Escape') setEditing(null)
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    disabled={isInherited || isDeleting}
                    title={isInherited ? configsStr.table.inheritedFrom(appNameOf(item.inheritedFrom!)) : configsStr.inline.hint}
                    className={cn(
                      'truncate text-left font-mono text-xs text-foreground',
                      !isInherited && !isDeleting && 'hover:text-primary',
                      isDeleting && 'line-through'
                    )}
                    onClick={() => setEditing({ id: item.id, value: item.value })}
                  >
                    {item.value || '—'}
                  </button>
                )}
                <span>
                  {/* 已上线判定：editStatus!==0（修改/删除方向/已提交都存在线上旧版） */}
                  {item.editStatus !== 0 ? (
                    <span className={`${badgeCls} bg-success/10 text-success`}>{configsStr.badges.online}</span>
                  ) : (
                    <span className={`${badgeCls} bg-input text-muted-foreground`}>{configsStr.badges.offline}</span>
                  )}
                </span>
                <span>
                  <EditStatusBadge item={item} />
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {item.updateTime ? item.updateTime.slice(5, 16).replace('T', ' ') : '—'}
                </span>
                <span className="flex items-center justify-end gap-1 pr-1">
                  {!isInherited && (
                    <>
                      {item.editStatus !== 0 && (
                        <button
                          type="button"
                          className="rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-hover hover:text-foreground"
                          onClick={() => onHistory(item)}
                        >
                          {configsStr.actions.history}
                        </button>
                      )}
                      <button
                        type="button"
                        className="rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-hover hover:text-foreground"
                        onClick={() => onEdit(item)}
                      >
                        {configsStr.actions.edit}
                      </button>
                      {item.editStatus !== 10 && (
                        <button
                          type="button"
                          className="rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-hover hover:text-foreground"
                          onClick={() => onCancelEdit(item)}
                        >
                          {configsStr.actions.cancelEdit}
                        </button>
                      )}
                      <button
                        type="button"
                        className="rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-hover hover:text-danger"
                        onClick={() => onDelete(item)}
                      >
                        {configsStr.actions.delete}
                      </button>
                    </>
                  )}
                </span>
              </div>
            )
          })}
        </div>

        {rows.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            {configsStr.empty.noMatch}
          </div>
        )}
      </div>
    </div>
  )
}
