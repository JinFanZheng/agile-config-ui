import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { AppItem } from '../../api/apps'
import { getAllUsers, getUserAppAuth, saveAppAuth } from '../../api/access'
import { Button } from '../../components/ui/button'
import { Modal } from '../../components/ui/modal'
import { Spinner } from '../../components/ui/spinner'
import { ApiError } from '../../lib/http'
import { toast } from '../../stores/toast'
import { accessStr } from '../../strings/access'

/** 应用授权（APP_AUTH）：选择可管理该应用的用户，服务端强制校验 */
export function AppAuthDialog({ app, onClose }: { app: AppItem | null; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<Set<string> | null>(null)
  const [error, setError] = useState<string | null>(null)

  const users = useQuery({
    queryKey: ['access', 'allUsers'],
    queryFn: getAllUsers,
    enabled: app !== null,
    staleTime: 60_000,
  })
  const current = useQuery({
    queryKey: ['access', 'appAuth', app?.id],
    queryFn: () => getUserAppAuth(app!.id),
    enabled: app !== null,
    staleTime: 0,
  })

  // 打开后用服务端当前授权初始化选择
  if (selected === null && current.data) setSelected(new Set(current.data.authorizedUsers ?? []))

  const mutation = useMutation({
    mutationFn: () => saveAppAuth(app!.id, [...(selected ?? new Set())]),
    onSuccess: async () => {
      toast.success(accessStr.appAuth.toasts.saved)
      await queryClient.invalidateQueries({ queryKey: ['access', 'appAuth', app?.id] })
      onClose()
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : accessStr.appAuth.toasts.failed),
  })

  const toggle = (id: string) =>
    setSelected((prev) => {
      const base = prev ?? new Set(current.data?.authorizedUsers ?? [])
      const next = new Set(base)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <Modal
      open={app !== null}
      onClose={onClose}
      title={accessStr.appAuth.title(app?.name ?? '')}
      width="max-w-md"
    >
      <div className="flex flex-col gap-3">
        {error && (
          <div
            role="alert"
            className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger"
          >
            {error}
          </div>
        )}
        <p className="text-xs text-muted-foreground">{accessStr.appAuth.hint}</p>

        <div className="max-h-64 overflow-y-auto rounded-md border border-border">
          {users.isLoading ? (
            <p className="px-3 py-3 text-xs text-muted-foreground">
              {accessStr.appAuth.usersLoading}
            </p>
          ) : (users.data ?? []).length === 0 ? (
            <p className="px-3 py-3 text-xs text-muted-foreground">
              {accessStr.appAuth.usersEmpty}
            </p>
          ) : (
            (users.data ?? []).map((u) => {
              const checked = (selected ?? new Set(current.data?.authorizedUsers ?? [])).has(u.id)
              return (
                <label
                  key={u.id}
                  className="flex cursor-pointer items-center gap-2 border-b border-border px-3 py-1.5 text-xs last:border-b-0 hover:bg-hover"
                >
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={checked}
                    onChange={() => toggle(u.id)}
                  />
                  <span className="font-mono">{u.userName}</span>
                  {u.team && <span className="text-muted-foreground">{u.team}</span>}
                </label>
              )
            })
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {accessStr.appAuth.selected(
              (selected ?? new Set(current.data?.authorizedUsers ?? [])).size
            )}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
              取消
            </Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || users.isLoading}
            >
              {mutation.isPending && <Spinner />}
              {mutation.isPending ? accessStr.appAuth.saving : accessStr.appAuth.save}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
