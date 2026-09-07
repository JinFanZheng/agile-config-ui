import { useMutation } from '@tanstack/react-query'
import { Clock, Cloud, Layers, Plus, Table2 } from 'lucide-react'
import { Suspense, lazy, useCallback, useMemo, useState } from 'react'
import { useSearchParams, useParams } from 'react-router'
import {
  cancelEdit,
  cancelEdits,
  deleteConfig,
  deleteConfigs,
  editConfig,
  getConfig,
  type ConfigItem,
} from '../../api/configs'
import { Breadcrumb } from '../../components/Breadcrumb'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Skeleton } from '../../components/ui/spinner'
import { usePermission } from '../../hooks/usePermission'
import { PERMISSION } from '../../lib/permissions'
import { useEnvStore } from '../../stores/env'
import { toast } from '../../stores/toast'
import { configsStr } from '../../strings/configs'
import { publishStr } from '../../strings/publish'
import { cn } from '../../lib/utils'
import { ConfigDialog } from './ConfigDialog'
import { ConfigHistoryDialog } from '../publish/ConfigHistoryDialog'
import { HistoryPanel } from '../publish/HistoryPanel'
import { PublishDialog } from '../publish/PublishDialog'
import { ConfigTable } from './ConfigTable'
import {
  mergeInherited,
  useAppInfo,
  useConfigs,
  useInheritedConfigs,
  useInvalidateConfigs,
  useWaitPublish,
} from './useConfigs'

const KvView = lazy(() => import('./KvView').then((m) => ({ default: m.KvView })))
const JsonView = lazy(() => import('./JsonView').then((m) => ({ default: m.JsonView })))

type View = 'table' | 'kv' | 'json' | 'history'

type Confirm =
  | { kind: 'delete'; item: ConfigItem }
  | { kind: 'batchDelete'; ids: string[] }
  | { kind: 'cancelOne'; item: ConfigItem }
  | { kind: 'cancelAll'; ids: string[] }
  | { kind: 'switchView'; to: View }
  | { kind: 'inlineConflict'; item: ConfigItem; value: string; freshUpdateTime: string }
  | null

const ENV_DOT: Record<string, string> = {
  DEV: 'bg-env-dev',
  TEST: 'bg-env-test',
  PROD: 'bg-env-prod',
}

export function ConfigPage() {
  const { appId = '' } = useParams()
  const env = useEnvStore((s) => s.currentEnv)
  const invalidate = useInvalidateConfigs()

  const [searchParams] = useSearchParams()
  const initialViewParam = searchParams.get('view') as View | null
  const initialView: View = ['table', 'kv', 'json', 'history'].includes(initialViewParam ?? '')
    ? (initialViewParam as View)
    : 'table'
  const [view, setView] = useState<View>(initialView)
  const [viewDirty, setViewDirty] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [showInherited, setShowInherited] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<(ConfigItem & { inheritedFrom?: string }) | null>(null)
  const [confirm, setConfirm] = useState<Confirm>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [publishOpen, setPublishOpen] = useState(false)
  const { can } = usePermission()
  const [historyItem, setHistoryItem] = useState<ConfigItem | null>(null)

  const appInfo = useAppInfo(appId)
  const configsQ = useConfigs(appId, env)
  const wait = useWaitPublish(appId, env)
  const inheritIds = useMemo(() => appInfo.data?.inheritancedApps ?? [], [appInfo.data])
  const inheritedQ = useInheritedConfigs(appId, env, inheritIds, showInherited)

  const appNameOf = useCallback(
    (id: string) => {
      const names = appInfo.data?.inheritancedAppNames ?? []
      const i = inheritIds.indexOf(id)
      return (i >= 0 && names[i]) || id
    },
    [appInfo.data, inheritIds]
  )

  const own = useMemo(() => configsQ.data?.data ?? [], [configsQ.data])
  const rows = useMemo<(ConfigItem & { inheritedFrom?: string })[]>(() => {
    if (!showInherited || !inheritedQ.data) return own
    const lists = inheritedQ.data.map((page, i) => ({ appId: inheritIds[i], list: page.data }))
    return mergeInherited(own, lists)
  }, [own, showInherited, inheritedQ.data, inheritIds])

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    if (!kw) return rows
    return rows.filter(
      (r) =>
        r.key.toLowerCase().includes(kw) ||
        r.value.toLowerCase().includes(kw) ||
        (r.group ?? '').toLowerCase().includes(kw)
    )
  }, [rows, keyword])

  // 待发布行 = editStatus !== Commit(10)（真实枚举：0新增/1修改/2删除）
  const pendingIds = useMemo(() => own.filter((c) => c.editStatus !== 10).map((c) => c.id), [own])

  const refresh = async () => {
    await invalidate(appId, env)
    setReloadKey((k) => k + 1)
  }

  const delMutation = useMutation({
    mutationFn: (id: string) => deleteConfig(id, env),
    onSuccess: () => {
      toast.success(configsStr.toasts.deleted)
      refresh()
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : configsStr.toasts.failed),
  })
  const batchDelMutation = useMutation({
    mutationFn: (ids: string[]) => deleteConfigs(ids, env),
    onSuccess: (_d, ids) => {
      toast.success(configsStr.toasts.batchDeleted(ids.length))
      setSelected(new Set())
      refresh()
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : configsStr.toasts.failed),
  })
  const cancelOneMutation = useMutation({
    mutationFn: (id: string) => cancelEdit(id, env),
    onSuccess: () => {
      toast.success(configsStr.toasts.editCanceled)
      refresh()
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : configsStr.toasts.failed),
  })
  const cancelAllMutation = useMutation({
    mutationFn: (ids: string[]) => cancelEdits(ids, env),
    onSuccess: () => {
      toast.success(configsStr.toasts.allCanceled)
      refresh()
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : configsStr.toasts.failed),
  })

  /** 行内快编：先比对服务端 updateTime，冲突时让用户选覆盖/放弃（UX #11） */
  const inlineSave = async (item: ConfigItem, value: string) => {
    try {
      const fresh = await getConfig(item.id, env)
      if (fresh.updateTime && item.updateTime && fresh.updateTime !== item.updateTime) {
        setConfirm({ kind: 'inlineConflict', item, value, freshUpdateTime: fresh.updateTime })
        return
      }
      await editConfig({ ...item, value }, env)
      toast.success(configsStr.toasts.saved)
      refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : configsStr.toasts.failed)
    }
  }

  const switchView = (to: View) => {
    if (viewDirty && to !== view) setConfirm({ kind: 'switchView', to })
    else setView(to)
  }

  const wp = wait.data
  const hasPending = !!wp && wp.addCount + wp.editCount + wp.deleteCount > 0
  const isLoading = configsQ.isLoading

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col gap-3">
      {/* 页头：面包屑（交互规范：≥2 级页面） */}
      <div className="flex flex-wrap items-center gap-3">
        <Breadcrumb
          asHeading
          items={[
            { label: '应用', to: '/apps' },
            { label: appInfo.data?.name ?? appId, mono: true },
          ]}
        />
        <span className="flex items-center gap-1.5 rounded-md border border-border bg-panel px-2 py-0.5 font-mono text-xs">
          <span className={cn('h-1.5 w-1.5 rounded-full', ENV_DOT[env] ?? 'bg-muted-foreground')} />
          {env}
        </span>
        <div className="ml-auto flex items-center gap-1 rounded-md border border-border bg-panel p-0.5">
          {(
            [
              ['table', configsStr.views.table, Table2],
              ['kv', configsStr.views.kv, Layers],
              ['json', configsStr.views.json, Cloud],
              ['history', configsStr.views.history, Clock],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => switchView(id)}
              className={cn(
                'flex h-6 items-center gap-1.5 rounded px-2.5 text-xs transition-colors duration-150',
                view === id
                  ? 'bg-selected font-medium text-selected-foreground'
                  : 'text-muted-foreground hover:bg-hover hover:text-foreground'
              )}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 待发布条（UX #2 常显） */}
      <div
        className={cn(
          'flex flex-wrap items-center gap-2.5 rounded-lg border px-4 py-2.5',
          hasPending ? 'border-warning/50 bg-warning/5' : 'border-border bg-panel'
        )}
      >
        <span
          className={cn(
            'text-xs font-semibold',
            hasPending ? 'text-warning' : 'text-muted-foreground'
          )}
        >
          {configsStr.pendingStrip.label}
        </span>
        {hasPending ? (
          <>
            <span className="rounded-full bg-info/10 px-2.5 py-0.5 text-xs text-info">
              {configsStr.pendingStrip.add(wp!.addCount)}
            </span>
            <span className="rounded-full bg-warning/10 px-2.5 py-0.5 text-xs text-warning">
              {configsStr.pendingStrip.edit(wp!.editCount)}
            </span>
            <span className="rounded-full bg-danger/10 px-2.5 py-0.5 text-xs text-danger">
              {configsStr.pendingStrip.del(wp!.deleteCount)}
            </span>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">{configsStr.pendingStrip.none}</span>
        )}
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => switchView('history')}
          className="text-xs text-muted-foreground transition-colors hover:text-primary hover:underline"
        >
          {publishStr.history.title} →
        </button>
        {hasPending && (
          <>
            <Button
              size="sm"
              variant="ghost"
              disabled={cancelAllMutation.isPending}
              onClick={() => setConfirm({ kind: 'cancelAll', ids: pendingIds })}
            >
              {configsStr.pendingStrip.cancelAll}
            </Button>
            {can(PERMISSION.ConfigPublish) && (
              <Button size="sm" onClick={() => setPublishOpen(true)}>
                {configsStr.pendingStrip.publish}
              </Button>
            )}
          </>
        )}
      </div>

      {view === 'table' ? (
        <>
          {/* 工具栏 */}
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="w-full max-w-xs sm:w-auto"
              placeholder={configsStr.searchPlaceholder}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            {inheritIds.length > 0 && (
              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={showInherited}
                  onChange={(e) => setShowInherited(e.target.checked)}
                />
                {configsStr.table.showInherited}
              </label>
            )}
            <div className="flex-1" />
            {selected.size > 0 && (
              <div className="flex items-center gap-2 rounded-md border border-border bg-panel px-2 py-1 text-xs">
                <span className="text-muted-foreground">
                  {configsStr.batchBar.selected(selected.size)}
                </span>
                <button
                  type="button"
                  className="rounded px-1.5 py-0.5 text-muted-foreground hover:bg-hover hover:text-foreground"
                  onClick={() => setConfirm({ kind: 'batchDelete', ids: [...selected] })}
                >
                  {configsStr.batchBar.delete}
                </button>
                <button
                  type="button"
                  className="rounded px-1.5 py-0.5 text-muted-foreground hover:bg-hover hover:text-foreground"
                  onClick={() => {
                    const ids = own
                      .filter((c) => selected.has(c.id) && c.editStatus !== 10)
                      .map((c) => c.id)
                    if (ids.length === 0) {
                      toast.info('所选配置没有待发布改动')
                      return
                    }
                    setConfirm({ kind: 'cancelAll', ids })
                  }}
                >
                  {configsStr.batchBar.cancel}
                </button>
                <button
                  type="button"
                  className="rounded px-1.5 py-0.5 text-muted-foreground hover:bg-hover hover:text-foreground"
                  onClick={() => setSelected(new Set())}
                >
                  {configsStr.batchBar.clear}
                </button>
              </div>
            )}
            {can(PERMISSION.ConfigAdd) && (
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null)
                  setDialogOpen(true)
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                {configsStr.create}
              </Button>
            )}
          </div>

          {/* 表格 / 状态 */}
          {isLoading ? (
            <div className="flex-1 rounded-lg border border-border bg-panel p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="mb-2 h-6 w-full" />
              ))}
            </div>
          ) : own.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-border bg-panel">
              <p className="text-sm text-muted-foreground">{configsStr.empty.title}</p>
              {can(PERMISSION.ConfigAdd) && (
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    setEditing(null)
                    setDialogOpen(true)
                  }}
                >
                  {configsStr.empty.action}
                </Button>
              )}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-border bg-panel">
              <p className="text-sm text-muted-foreground">{configsStr.empty.noMatch}</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => setKeyword('')}>
                {configsStr.empty.clearFilter}
              </Button>
            </div>
          ) : (
            <ConfigTable
              rows={filtered}
              appNameOf={appNameOf}
              collapsed={collapsed}
              onToggleGroup={(g) =>
                setCollapsed((prev) => {
                  const next = new Set(prev)
                  if (next.has(g)) next.delete(g)
                  else next.add(g)
                  return next
                })
              }
              selected={selected}
              onToggleSelect={(id) =>
                setSelected((prev) => {
                  const next = new Set(prev)
                  if (next.has(id)) next.delete(id)
                  else next.add(id)
                  return next
                })
              }
              onToggleAll={() =>
                setSelected((prev) => {
                  const visible = filtered.filter((r) => !r.inheritedFrom)
                  const all = visible.every((r) => prev.has(r.id))
                  return all ? new Set() : new Set(visible.map((r) => r.id))
                })
              }
              onInlineSave={inlineSave}
              onEdit={(item) => {
                setEditing(item)
                setDialogOpen(true)
              }}
              onDelete={(item) => setConfirm({ kind: 'delete', item })}
              onCancelEdit={(item) => setConfirm({ kind: 'cancelOne', item })}
              onHistory={(item) => setHistoryItem(item)}
            />
          )}
        </>
      ) : view === 'kv' ? (
        <Suspense fallback={<Skeleton className="flex-1" />}>
          <KvView
            appId={appId}
            env={env}
            onDirtyChange={setViewDirty}
            onSaved={refresh}
            reloadKey={reloadKey}
          />
        </Suspense>
      ) : view === 'json' ? (
        <Suspense fallback={<Skeleton className="flex-1" />}>
          <JsonView
            appId={appId}
            env={env}
            onDirtyChange={setViewDirty}
            onSaved={refresh}
            reloadKey={reloadKey}
          />
        </Suspense>
      ) : (
        <HistoryPanel appId={appId} env={env} />
      )}

      <ConfigDialog
        open={dialogOpen}
        config={editing}
        appId={appId}
        env={env}
        onDone={() => {
          setDialogOpen(false)
          refresh()
        }}
        onCreated={() => setKeyword('')}
      />

      <PublishDialog
        open={publishOpen}
        appId={appId}
        env={env}
        onDone={() => {
          setPublishOpen(false)
          refresh()
        }}
      />

      <ConfigHistoryDialog config={historyItem} env={env} onClose={() => setHistoryItem(null)} />

      {/* 确认流 */}
      {confirm?.kind === 'delete' && (
        <ConfirmDialog
          open
          danger
          title={configsStr.confirm.deleteTitle}
          body={configsStr.confirm.deleteBody(confirm.item.key)}
          confirmText={configsStr.actions.delete}
          busy={delMutation.isPending}
          onCancel={() => setConfirm(null)}
          onConfirm={() =>
            delMutation.mutate(confirm.item.id, { onSuccess: () => setConfirm(null) })
          }
        />
      )}
      {confirm?.kind === 'batchDelete' && (
        <ConfirmDialog
          open
          danger
          title={configsStr.confirm.batchDeleteTitle}
          body={configsStr.confirm.batchDeleteBody(confirm.ids.length)}
          confirmText={configsStr.batchBar.delete}
          busy={batchDelMutation.isPending}
          onCancel={() => setConfirm(null)}
          onConfirm={() =>
            batchDelMutation.mutate(confirm.ids, { onSuccess: () => setConfirm(null) })
          }
        />
      )}
      {confirm?.kind === 'cancelOne' && (
        <ConfirmDialog
          open
          title={configsStr.actions.cancelEdit}
          body={`将撤销「${confirm.item.key}」未发布的修改。确定继续？`}
          confirmText={configsStr.actions.cancelEdit}
          busy={cancelOneMutation.isPending}
          onCancel={() => setConfirm(null)}
          onConfirm={() =>
            cancelOneMutation.mutate(confirm.item.id, { onSuccess: () => setConfirm(null) })
          }
        />
      )}
      {confirm?.kind === 'cancelAll' && (
        <ConfirmDialog
          open
          title={configsStr.confirm.cancelAllTitle}
          body={configsStr.confirm.cancelAllBody}
          confirmText={configsStr.pendingStrip.cancelAll}
          busy={cancelAllMutation.isPending}
          onCancel={() => setConfirm(null)}
          onConfirm={() =>
            cancelAllMutation.mutate(confirm.ids, { onSuccess: () => setConfirm(null) })
          }
        />
      )}
      {confirm?.kind === 'switchView' && (
        <ConfirmDialog
          open
          danger
          title={configsStr.kv.dirtyGuardTitle}
          body="当前视图有未保存的修改，切换后将丢失。确定切换？"
          confirmText="放弃修改并切换"
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            setViewDirty(false)
            setView(confirm.to)
            setConfirm(null)
          }}
        />
      )}
      {confirm?.kind === 'inlineConflict' && (
        <div className="anim-overlay fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <div
            role="alertdialog"
            className="anim-modal w-full max-w-sm rounded-lg border border-border bg-panel p-5 shadow-overlay"
          >
            <h2 className="text-sm font-semibold text-warning">
              {configsStr.confirm.concurrencyTitle}
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {configsStr.confirm.concurrencyBody(confirm.item.key)}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setConfirm(null)
                  refresh()
                }}
              >
                {configsStr.confirm.concurrencyDiscard}
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  const { item, value } = confirm
                  setConfirm(null)
                  try {
                    await editConfig({ ...item, value }, env)
                    toast.success(configsStr.toasts.saved)
                    refresh()
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : configsStr.toasts.failed)
                  }
                }}
              >
                {configsStr.confirm.concurrencyOverwrite}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
