import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  addUser,
  deleteUser,
  editUser,
  listRoles,
  resetPassword,
  searchUsers,
  type UserItem,
} from '../../api/access'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Modal } from '../../components/ui/modal'
import { Skeleton, Spinner } from '../../components/ui/spinner'
import { useDirtyGuard } from '../../hooks/useDirtyGuard'
import { usePermission } from '../../hooks/usePermission'
import { ApiError } from '../../lib/http'
import { useSettingsStore } from '../../stores/settings'
import { PERMISSION } from '../../lib/permissions'
import { toast } from '../../stores/toast'
import { usersStr } from '../../strings/users'


type ConfirmState = { kind: 'reset'; user: UserItem } | { kind: 'delete'; user: UserItem } | null

// 新建：用户名/初始密码必填（密码 ≥6 位）；编辑：仅 team/userRoleIds 可改（服务端契约）
const createSchema = z.object({
  userName: z.string().min(1, usersStr.errors.userNameRequired),
  password: z.string().min(1, usersStr.errors.passwordRequired).min(6, usersStr.errors.passwordMin),
  team: z.string(),
  userRoleIds: z.array(z.string()),
})
const editSchema = z.object({
  userName: z.string(),
  password: z.string(),
  team: z.string(),
  userRoleIds: z.array(z.string()),
})
type UserFormValues = z.infer<typeof createSchema>

/** 新建/编辑用户：新建含用户名/初始密码；编辑仅团队与角色（用户名/密码走独立入口） */
function UserDialog({
  open,
  user,
  onClose,
}: {
  open: boolean
  /** 编辑对象；null = 新建 */
  user: UserItem | null
  onClose: () => void
}) {
  const isEdit = user !== null
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const form = useForm<UserFormValues>({
    resolver: zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: { userName: '', password: '', team: '', userRoleIds: [] },
  })

  // 打开时重置：新建 → 空表单；编辑 → 预填团队/角色
  useEffect(() => {
    if (!open) return
    setError(null)
    form.reset(
      user
        ? {
            userName: user.userName,
            password: '',
            team: user.team ?? '',
            userRoleIds: user.userRoleIds ?? [],
          }
        : { userName: '', password: '', team: '', userRoleIds: [] }
    )
  }, [open, user, form])

  const roles = useQuery({
    queryKey: ['roles', 'list'],
    queryFn: listRoles,
    enabled: open,
    staleTime: 60_000,
  })

  const mutation = useMutation({
    mutationFn: (values: UserFormValues) => {
      if (user) {
        return editUser({ id: user.id, team: values.team, userRoleIds: values.userRoleIds })
      }
      return addUser({
        userName: values.userName,
        password: values.password,
        team: values.team,
        userRoleIds: values.userRoleIds,
      })
    },
    onSuccess: async () => {
      toast.success(
        isEdit
          ? usersStr.toasts.saved(form.getValues('userName'))
          : usersStr.toasts.created(form.getValues('userName'))
      )
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      onClose()
    },
    // 服务端错误（如用户名已存在）在弹窗内联透出
    onError: (e) => setError(e instanceof ApiError ? e.message : usersStr.errors.saveFailed),
  })

  const selectedRoles = form.watch('userRoleIds')

  const { requestClose, guardNode } = useDirtyGuard(onClose, form.formState.isDirty)

  return (
    <Modal
      open={open}
      onClose={requestClose}
      title={isEdit ? usersStr.dialog.editTitle : usersStr.dialog.createTitle}
    >
      {guardNode}
      <form
        onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
        noValidate
        className="flex flex-col gap-4"
      >
        {error && (
          <div
            role="alert"
            className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger"
          >
            {error}
          </div>
        )}

        {user ? (
          <div className="flex flex-col gap-1.5">
            <Label>{usersStr.dialog.userName}</Label>
            <Input className="font-mono" value={user.userName} disabled readOnly />
            <p className="text-[11px] text-muted-foreground">{usersStr.dialog.userNameHint}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="user-name">{usersStr.dialog.userName}</Label>
            <Input
              id="user-name"
              autoFocus
              placeholder={usersStr.dialog.userNamePlaceholder}
              {...form.register('userName')}
            />
            {form.formState.errors.userName && (
              <p className="text-xs text-danger">{form.formState.errors.userName.message}</p>
            )}
          </div>
        )}

        {!isEdit && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="user-password">{usersStr.dialog.password}</Label>
            <Input
              id="user-password"
              type="password"
              placeholder={usersStr.dialog.passwordPlaceholder}
              {...form.register('password')}
            />
            {form.formState.errors.password && (
              <p className="text-xs text-danger">{form.formState.errors.password.message}</p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="user-team">{usersStr.dialog.team}</Label>
          <Input
            id="user-team"
            placeholder={usersStr.dialog.teamPlaceholder}
            {...form.register('team')}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>{usersStr.dialog.roles}</Label>
          <p className="text-[11px] text-muted-foreground">{usersStr.dialog.rolesHint}</p>
          <div className="max-h-36 overflow-y-auto rounded-md border border-border">
            {roles.isLoading ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                {usersStr.dialog.rolesLoading}
              </p>
            ) : (roles.data ?? []).length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                {usersStr.dialog.rolesEmpty}
              </p>
            ) : (
              (roles.data ?? []).map((role) => (
                <label
                  key={role.id}
                  className="flex cursor-pointer items-center gap-2 border-b border-border px-3 py-1.5 text-xs text-foreground last:border-b-0 hover:bg-hover"
                >
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={selectedRoles.includes(role.id)}
                    onChange={(e) => {
                      const cur = form.getValues('userRoleIds')
                      form.setValue(
                        'userRoleIds',
                        e.target.checked ? [...cur, role.id] : cur.filter((x) => x !== role.id),
                        { shouldDirty: true }
                      )
                    }}
                  />
                  <span>{role.name}</span>
                  {role.description && (
                    <span className="truncate text-muted-foreground" title={role.description}>
                      {role.description}
                    </span>
                  )}
                </label>
              ))
            )}
          </div>
        </div>

        <div className="mt-1 flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={requestClose}
            disabled={mutation.isPending}
          >
            {usersStr.dialog.cancel}
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Spinner />}
            {isEdit
              ? mutation.isPending
                ? usersStr.dialog.saving
                : usersStr.dialog.save
              : mutation.isPending
                ? usersStr.dialog.submitting
                : usersStr.dialog.submit}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export function UsersPage() {
  // 列表初始分页大小：设置中心可配（ITER-24），reactive 进 queryKey
  const pageSize = useSettingsStore((s) => s.defaultPageSize)

  const queryClient = useQueryClient()
  const { can } = usePermission()
  const [keyword, setKeyword] = useState('')
  const [debounced, setDebounced] = useState('')
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<UserItem | null>(null)
  const [confirm, setConfirm] = useState<ConfirmState>(null)

  // 搜索防抖 300ms；回车立即（交互规范 §7）
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(keyword.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [keyword])

  const search = useQuery({
    queryKey: ['users', 'search', { userName: debounced, current: page, pageSize: pageSize }],
    queryFn: () =>
      searchUsers({
        userName: debounced || undefined,
        current: page,
        pageSize: pageSize,
      }),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['users'] })
  const resetMutation = useMutation({
    mutationFn: (id: string) => resetPassword(id),
    onSuccess: () => {
      // 服务端固定重置为默认密码 123456，必须明示并提醒改密
      toast.success(usersStr.toasts.passwordReset)
      invalidate()
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : usersStr.toasts.failed),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: (_data, id) => {
      const user = rows.find((u) => u.id === id)
      if (user) toast.success(usersStr.toasts.deleted(user.userName))
      // 删除当前页最后一条时回退一页，避免空页
      if (rows.length === 1 && page > 1) setPage(page - 1)
      invalidate()
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : usersStr.toasts.failed),
  })

  const rows = search.data?.data ?? []
  const total = search.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start gap-3">
        <div>
          <h1 className="text-base font-semibold">{usersStr.title}</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">{usersStr.subtitle}</p>
        </div>
        {can(PERMISSION.UserAdd) && (
          <div className="ml-auto">
            <Button
              onClick={() => {
                setEditing(null)
                setDialogOpen(true)
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              {usersStr.create}
            </Button>
          </div>
        )}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input
          className="w-full max-w-xs sm:w-auto"
          placeholder={usersStr.searchPlaceholder}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setDebounced(keyword.trim())
              setPage(1)
            }
          }}
        />
        <div className="ml-auto text-xs text-muted-foreground">{usersStr.count(total)}</div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-panel shadow-card">
        <table className="w-full min-w-[640px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-border bg-elevated text-left text-xs text-muted-foreground">
              <th className="w-[220px] px-4 py-2 font-medium whitespace-nowrap">
                {usersStr.table.userName}
              </th>
              <th className="w-[160px] px-4 py-2 font-medium whitespace-nowrap">
                {usersStr.table.team}
              </th>
              <th className="px-4 py-2 font-medium whitespace-nowrap">{usersStr.table.roles}</th>
              <th className="w-[220px] px-4 py-2 text-right font-medium whitespace-nowrap">
                {usersStr.table.actions}
              </th>
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
                    {search.error instanceof ApiError ? search.error.message : usersStr.loadFailed}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => search.refetch()}
                  >
                    {usersStr.retry}
                  </Button>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center">
                  {debounced ? (
                    <>
                      <p className="text-sm text-muted-foreground">{usersStr.noMatchTitle}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3"
                        onClick={() => setKeyword('')}
                      >
                        {usersStr.clearFilter}
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">{usersStr.emptyTitle}</p>
                      {can(PERMISSION.UserAdd) && (
                        <Button
                          size="sm"
                          className="mt-3"
                          onClick={() => {
                            setEditing(null)
                            setDialogOpen(true)
                          }}
                        >
                          {usersStr.emptyAction}
                        </Button>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ) : (
              rows.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-border transition-colors last:border-b-0 hover:bg-hover"
                >
                  <td className="px-4 py-[7px]">
                    <span
                      className="block max-w-[200px] truncate font-mono text-xs"
                      title={user.userName}
                    >
                      {user.userName}
                    </span>
                  </td>
                  <td className="px-4 py-[7px]">
                    <span
                      className="block max-w-[140px] truncate text-xs text-muted-foreground"
                      title={user.team || undefined}
                    >
                      {user.team || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-[7px]">
                    {(user.userRoleNames ?? []).length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {(user.userRoleNames ?? []).map((name) => (
                          <span
                            key={name}
                            className="rounded bg-input px-1.5 py-0.5 text-[10px] text-muted-foreground"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-[7px] text-right">
                    <div className="flex items-center justify-end gap-1 [&>button]:whitespace-nowrap [&>a]:whitespace-nowrap">
                      {can(PERMISSION.UserEdit) && (
                        <button
                          type="button"
                          className="rounded px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
                          onClick={() => {
                            setEditing(user)
                            setDialogOpen(true)
                          }}
                        >
                          {usersStr.actions.edit}
                        </button>
                      )}
                      {can(PERMISSION.UserEdit) && (
                        <button
                          type="button"
                          className="rounded px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
                          onClick={() => setConfirm({ kind: 'reset', user })}
                        >
                          {usersStr.actions.resetPassword}
                        </button>
                      )}
                      {can(PERMISSION.UserDelete) && (
                        <button
                          type="button"
                          className="rounded px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-hover hover:text-danger"
                          onClick={() => setConfirm({ kind: 'delete', user })}
                        >
                          {usersStr.actions.delete}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {total > pageSize && (
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

      <UserDialog open={dialogOpen} user={editing} onClose={() => setDialogOpen(false)} />

      {confirm?.kind === 'reset' && (
        <ConfirmDialog
          open
          danger
          title={usersStr.confirm.resetTitle}
          body={usersStr.confirm.resetBody(confirm.user.userName)}
          confirmText={usersStr.actions.resetPassword}
          busy={resetMutation.isPending}
          onCancel={() => setConfirm(null)}
          onConfirm={() =>
            resetMutation.mutate(confirm.user.id, { onSuccess: () => setConfirm(null) })
          }
        />
      )}
      {confirm?.kind === 'delete' && (
        <ConfirmDialog
          open
          danger
          title={usersStr.confirm.deleteTitle}
          body={usersStr.confirm.deleteBody(confirm.user.userName)}
          confirmText={usersStr.actions.delete}
          busy={deleteMutation.isPending}
          onCancel={() => setConfirm(null)}
          onConfirm={() =>
            deleteMutation.mutate(confirm.user.id, { onSuccess: () => setConfirm(null) })
          }
        />
      )}
    </div>
  )
}
