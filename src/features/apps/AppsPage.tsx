import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Plus, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import {
  deleteApp,
  disableOrEnableApp,
  getApp,
  getAppGroups,
  searchApps,
  type AppItem,
} from '../../api/apps'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { CopyButton } from '../../components/CopyButton'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Modal } from '../../components/ui/modal'
import { Skeleton } from '../../components/ui/spinner'
import { ApiError } from '../../lib/http'
import { appsStr } from '../../strings/apps'
import { AppDialog } from './AppDialog'

const PAGE_SIZE = 20

type ConfirmState =
  | { kind: 'delete'; app: AppItem }
  | { kind: 'disable'; app: AppItem }
  | { kind: 'enable'; app: AppItem }
  | null

export function AppsPage() {
  const queryClient = useQueryClient()
  const [keyword, setKeyword] = useState('')
  const [debounced, setDebounced] = useState('')
  const [group, setGroup] = useState('')
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AppItem | null>(null)
  const [confirm, setConfirm] = useState<ConfirmState>(null)
  const [secretApp, setSecretApp] = useState<AppItem | null>(null)

  // 搜索防抖 300ms（UX #5 即时过滤的服务端侧）
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(keyword.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [keyword])

  const search = useQuery({
    queryKey: ['apps', 'search', { name: debounced, group, current: page, pageSize: PAGE_SIZE }],
    queryFn: () =>
      searchApps({
        name: debounced || undefined,
        group: group || undefined,
        current: page,
        pageSize: PAGE_SIZE,
      }),
  })

  const groups = useQuery({
    queryKey: ['apps', 'groups'],
    queryFn: getAppGroups,
    staleTime: 60_000,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['apps'] })
  const toggleMutation = useMutation({
    mutationFn: (id: string) => disableOrEnableApp(id),
    onSuccess: invalidate,
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteApp(id),
    onSuccess: invalidate,
  })

  const secretQuery = useQuery({
    queryKey: ['apps', 'secret', secretApp?.id],
    queryFn: () => getApp(secretApp!.id),
    enabled: secretApp !== null,
    staleTime: 0,
  })

  const rows = search.data?.data ?? []
  const total = search.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start gap-3">
        <div>
          <h1 className="text-base font-semibold">{appsStr.title}</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">{appsStr.subtitle}</p>
        </div>
        <div className="ml-auto">
          <Button
            onClick={() => {
              setEditing(null)
              setDialogOpen(true)
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            {appsStr.create}
          </Button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input
          className="w-full max-w-xs sm:w-auto"
          placeholder={appsStr.searchPlaceholder}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <select
          value={group}
          onChange={(e) => {
            setGroup(e.target.value)
            setPage(1)
          }}
          className="h-8 rounded-md border border-border bg-input px-2 text-xs text-foreground outline-none focus-visible:border-primary"
          aria-label="分组过滤"
        >
          <option value="">{appsStr.groupAll}</option>
          {(groups.data ?? []).map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <div className="ml-auto text-xs text-muted-foreground">{appsStr.count(total)}</div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-panel shadow-card">
        <table className="w-full min-w-[760px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-border bg-elevated text-left text-xs text-muted-foreground">
              <th className="px-4 py-2 font-medium">{appsStr.table.name}</th>
              <th className="px-4 py-2 font-medium">{appsStr.table.appId}</th>
              <th className="px-4 py-2 font-medium">{appsStr.table.group}</th>
              <th className="px-4 py-2 font-medium">{appsStr.table.status}</th>
              <th className="px-4 py-2 font-medium">{appsStr.table.inherit}</th>
              <th className="px-4 py-2 font-medium">{appsStr.table.updateTime}</th>
              <th className="px-4 py-2 text-right font-medium">{appsStr.table.actions}</th>
            </tr>
          </thead>
          <tbody>
            {search.isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-border last:border-b-0">
                  <td colSpan={7} className="px-4 py-3">
                    <Skeleton className="h-4 w-full" />
                  </td>
                </tr>
              ))
            ) : search.isError ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center">
                  <p className="text-xs text-danger">
                    {search.error instanceof ApiError ? search.error.message : '加载失败'}
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
                <td colSpan={7} className="px-4 py-12 text-center">
                  <p className="text-sm text-muted-foreground">{appsStr.emptyTitle}</p>
                  <Button
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      setEditing(null)
                      setDialogOpen(true)
                    }}
                  >
                    {appsStr.emptyAction}
                  </Button>
                </td>
              </tr>
            ) : (
              rows.map((app) => (
                <tr
                  key={app.id}
                  className="border-b border-border transition-colors last:border-b-0 hover:bg-hover"
                >
                  <td className="px-4 py-[7px]">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/apps/${app.id}/config`}
                        className="text-foreground hover:text-primary hover:underline"
                      >
                        {app.name}
                      </Link>
                      {app.inheritanced && (
                        <span className="rounded bg-info/10 px-1.5 py-0.5 text-[10px] text-info">
                          {appsStr.badges.shared}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-[7px]">
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-xs">{app.id}</span>
                      <CopyButton value={app.id} label={appsStr.actions.copyAppId} />
                    </div>
                  </td>
                  <td className="px-4 py-[7px] text-xs text-muted-foreground">
                    {app.group || appsStr.table.noGroup}
                  </td>
                  <td className="px-4 py-[7px]">
                    <span
                      className={
                        app.enabled
                          ? 'rounded bg-success/10 px-1.5 py-0.5 text-[10px] text-success'
                          : 'rounded bg-danger/10 px-1.5 py-0.5 text-[10px] text-danger'
                      }
                    >
                      {app.enabled ? appsStr.badges.enabled : appsStr.badges.disabled}
                    </span>
                  </td>
                  <td className="max-w-40 truncate px-4 py-[7px] text-xs text-muted-foreground">
                    {app.inheritancedAppNames && app.inheritancedAppNames.length > 0
                      ? appsStr.badges.inherits(app.inheritancedAppNames)
                      : '—'}
                  </td>
                  <td className="px-4 py-[7px] text-xs text-muted-foreground">
                    {app.updateTime ? app.updateTime.slice(5, 16).replace('T', ' ') : '—'}
                  </td>
                  <td className="px-4 py-[7px] text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        to={`/apps/${app.id}/config`}
                        className="rounded px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
                      >
                        {appsStr.actions.configs}
                      </Link>
                      <button
                        type="button"
                        className="rounded px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
                        onClick={() => setSecretApp(app)}
                      >
                        {appsStr.actions.secret}
                      </button>
                      <button
                        type="button"
                        className="rounded px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
                        onClick={() => {
                          setEditing(app)
                          setDialogOpen(true)
                        }}
                      >
                        {appsStr.actions.edit}
                      </button>
                      <button
                        type="button"
                        className="rounded px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
                        onClick={() =>
                          setConfirm(
                            app.enabled ? { kind: 'disable', app } : { kind: 'enable', app }
                          )
                        }
                      >
                        {app.enabled ? appsStr.actions.disable : appsStr.actions.enable}
                      </button>
                      <button
                        type="button"
                        className="rounded px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-hover hover:text-danger"
                        onClick={() => setConfirm({ kind: 'delete', app })}
                      >
                        {appsStr.actions.delete}
                      </button>
                    </div>
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

      <AppDialog open={dialogOpen} app={editing} onClose={() => setDialogOpen(false)} />

      <Modal
        open={secretApp !== null}
        title={appsStr.secretTitle}
        onClose={() => setSecretApp(null)}
      >
        {secretQuery.isLoading || !secretQuery.data ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">{appsStr.secretHint}</p>
            {(
              [
                ['AppId', secretQuery.data.id],
                ['Secret', secretQuery.data.secret ?? '—'],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-input/40 px-3 py-2"
              >
                <div>
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                  <p className="break-all font-mono text-xs">{value}</p>
                </div>
                {value !== '—' && (
                  <CopyButton
                    value={value}
                    label={
                      label === 'Secret' ? appsStr.actions.copySecret : appsStr.actions.copyAppId
                    }
                  />
                )}
              </div>
            ))}
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3 w-3" />
              凭证仅对有权限的管理员可见，请勿提交到代码仓库
            </div>
          </div>
        )}
      </Modal>

      {confirm?.kind === 'delete' && (
        <ConfirmDialog
          open
          danger
          title={appsStr.confirm.deleteTitle}
          body={appsStr.confirm.deleteBody(confirm.app.name)}
          confirmText={appsStr.actions.delete}
          busy={deleteMutation.isPending}
          onCancel={() => setConfirm(null)}
          onConfirm={() =>
            deleteMutation.mutate(confirm.app.id, { onSuccess: () => setConfirm(null) })
          }
        />
      )}
      {confirm && confirm.kind !== 'delete' && (
        <ConfirmDialog
          open
          title={
            confirm.kind === 'disable' ? appsStr.confirm.disableTitle : appsStr.confirm.enableTitle
          }
          body={
            confirm.kind === 'disable'
              ? appsStr.confirm.disableBody(confirm.app.name)
              : appsStr.confirm.enableBody(confirm.app.name)
          }
          confirmText={
            confirm.kind === 'disable' ? appsStr.actions.disable : appsStr.actions.enable
          }
          busy={toggleMutation.isPending}
          onCancel={() => setConfirm(null)}
          onConfirm={() =>
            toggleMutation.mutate(confirm.app.id, { onSuccess: () => setConfirm(null) })
          }
        />
      )}
    </div>
  )
}
