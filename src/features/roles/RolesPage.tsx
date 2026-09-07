import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  addRole,
  deleteRole,
  editRole,
  getSupportedPermissions,
  listRoles,
  type RoleItem,
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
import { PERMISSION } from '../../lib/permissions'
import { toast } from '../../stores/toast'
import { rolesStr } from '../../strings/roles'

const roleInputSchema = z.object({
  name: z.string().min(1, rolesStr.errors.nameRequired).max(128, rolesStr.errors.nameMax),
  description: z.string().max(512, rolesStr.errors.descriptionMax),
  functions: z.array(z.string()),
})
type RoleInputValues = z.infer<typeof roleInputSchema>

const OTHER_DOMAIN = '__other__'

interface PermissionGroup {
  domain: string
  label: string
  codes: string[]
}

/** 权限码按下划线前缀分域（APP_READ → 应用）；未知前缀统一归“其他” */
function groupPermissions(codes: readonly string[]): PermissionGroup[] {
  const known = Object.keys(rolesStr.domainNames)
  const buckets = new Map<string, string[]>()
  for (const code of codes) {
    const prefix = code.split('_')[0]
    const key = known.includes(prefix) ? prefix : OTHER_DOMAIN
    const bucket = buckets.get(key)
    if (bucket) bucket.push(code)
    else buckets.set(key, [code])
  }
  const ordered = known.filter((k) => buckets.has(k))
  if (buckets.has(OTHER_DOMAIN)) ordered.push(OTHER_DOMAIN)
  return ordered.map((key) => ({
    domain: key,
    label:
      key === OTHER_DOMAIN
        ? rolesStr.otherDomain
        : rolesStr.domainNames[key as keyof typeof rolesStr.domainNames],
    codes: buckets.get(key) ?? [],
  }))
}

/** 角色管理（ITER-07 T-03）：系统角色只读，自定义角色可建/改/删，权限码按域分组勾选 */
export function RolesPage() {
  const queryClient = useQueryClient()
  const { can } = usePermission()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<RoleItem | null>(null)
  const [deleting, setDeleting] = useState<RoleItem | null>(null)

  const roles = useQuery({ queryKey: ['roles', 'list'], queryFn: listRoles })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['roles'] })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRole(id),
    onSuccess: (_data, id) => {
      const role = (roles.data ?? []).find((r) => r.id === id)
      if (role) toast.success(rolesStr.toasts.deleted(role.name))
      invalidate()
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : rolesStr.toasts.failed),
  })

  const rows = roles.data ?? []

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start gap-3">
        <div>
          <h1 className="text-base font-semibold">{rolesStr.title}</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">{rolesStr.subtitle}</p>
        </div>
        {can(PERMISSION.RoleAdd) && (
          <div className="ml-auto">
            <Button
              onClick={() => {
                setEditing(null)
                setDialogOpen(true)
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              {rolesStr.create}
            </Button>
          </div>
        )}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="ml-auto text-xs text-muted-foreground">{rolesStr.count(rows.length)}</div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-panel shadow-card">
        <table className="w-full min-w-[640px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-border bg-elevated text-left text-xs text-muted-foreground">
              <th className="px-4 py-2 font-medium">{rolesStr.table.name}</th>
              <th className="px-4 py-2 font-medium">{rolesStr.table.description}</th>
              <th className="w-[88px] px-4 py-2 font-medium whitespace-nowrap">
                {rolesStr.table.type}
              </th>
              <th className="w-[88px] px-4 py-2 font-medium whitespace-nowrap">
                {rolesStr.table.permissions}
              </th>
              <th className="px-4 py-2 text-right font-medium">{rolesStr.table.actions}</th>
            </tr>
          </thead>
          <tbody>
            {roles.isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-border last:border-b-0">
                  <td colSpan={5} className="px-4 py-3">
                    <Skeleton className="h-4 w-full" />
                  </td>
                </tr>
              ))
            ) : roles.isError ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center">
                  <p className="text-xs text-danger">
                    {roles.error instanceof ApiError ? roles.error.message : rolesStr.loadFailed}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => roles.refetch()}
                  >
                    {rolesStr.retry}
                  </Button>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <p className="text-sm text-muted-foreground">{rolesStr.emptyTitle}</p>
                  {can(PERMISSION.RoleAdd) && (
                    <Button
                      size="sm"
                      className="mt-3"
                      onClick={() => {
                        setEditing(null)
                        setDialogOpen(true)
                      }}
                    >
                      {rolesStr.emptyAction}
                    </Button>
                  )}
                </td>
              </tr>
            ) : (
              rows.map((role) => {
                // 系统角色只读；自定义角色按权限码 fail-closed 隐藏入口（UX #9）
                const editable = !role.isSystem && can(PERMISSION.RoleEdit)
                const deletable = !role.isSystem && can(PERMISSION.RoleDelete)
                return (
                  <tr
                    key={role.id}
                    className="border-b border-border transition-colors last:border-b-0 hover:bg-hover"
                  >
                    <td className="px-4 py-[7px] font-medium">{role.name}</td>
                    <td
                      className="max-w-64 truncate px-4 py-[7px] text-xs text-muted-foreground"
                      title={role.description || undefined}
                    >
                      {role.description || '—'}
                    </td>
                    <td className="px-4 py-[7px] whitespace-nowrap">
                      {role.isSystem ? (
                        <span className="rounded bg-info/10 px-1.5 py-0.5 text-[10px] text-info">
                          {rolesStr.badges.system}
                        </span>
                      ) : (
                        <span className="rounded bg-elevated px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {rolesStr.badges.custom}
                        </span>
                      )}
                    </td>
                    <td
                      className="px-4 py-[7px] text-xs whitespace-nowrap"
                      title={role.functions.length > 0 ? role.functions.join(', ') : undefined}
                    >
                      {rolesStr.permCount(role.functions.length)}
                    </td>
                    <td className="px-4 py-[7px] text-right">
                      {editable || deletable ? (
                        <div className="flex items-center justify-end gap-1">
                          {editable && (
                            <button
                              type="button"
                              className="rounded px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
                              onClick={() => {
                                setEditing(role)
                                setDialogOpen(true)
                              }}
                            >
                              {rolesStr.actions.edit}
                            </button>
                          )}
                          {deletable && (
                            <button
                              type="button"
                              className="rounded px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-hover hover:text-danger"
                              onClick={() => setDeleting(role)}
                            >
                              {rolesStr.actions.delete}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <RoleDialog open={dialogOpen} role={editing} onClose={() => setDialogOpen(false)} />

      {deleting && (
        <ConfirmDialog
          open
          danger
          title={rolesStr.confirm.deleteTitle}
          body={rolesStr.confirm.deleteBody(deleting.name)}
          confirmText={rolesStr.actions.delete}
          busy={deleteMutation.isPending}
          onCancel={() => setDeleting(null)}
          onConfirm={() =>
            deleteMutation.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
          }
        />
      )}
    </div>
  )
}

interface RoleDialogProps {
  open: boolean
  /** 编辑对象；null = 新建 */
  role: RoleItem | null
  onClose: () => void
}

/** 新建/编辑角色：权限矩阵数据源 SupportedPermissions，新建 id 由客户端生成 */
function RoleDialog({ open, role, onClose }: RoleDialogProps) {
  const isEdit = role !== null
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const form = useForm<RoleInputValues>({
    resolver: zodResolver(roleInputSchema),
    defaultValues: { name: '', description: '', functions: [] },
  })

  // 打开时重置：编辑 → 预填；新建 → 空表单
  useEffect(() => {
    if (!open) return
    setError(null)
    form.reset({
      name: role?.name ?? '',
      description: role?.description ?? '',
      functions: role?.functions ? [...role.functions] : [],
    })
  }, [open, role, form])

  const permissions = useQuery({
    queryKey: ['roles', 'supportedPermissions'],
    queryFn: getSupportedPermissions,
    enabled: open,
    staleTime: 60_000,
  })

  const groups = useMemo(() => groupPermissions(permissions.data ?? []), [permissions.data])

  const mutation = useMutation({
    mutationFn: (values: RoleInputValues) =>
      isEdit && role
        ? editRole({ id: role.id, ...values })
        : addRole({ id: crypto.randomUUID(), ...values }),
    onSuccess: async () => {
      toast.success(
        isEdit
          ? rolesStr.toasts.saved(form.getValues('name'))
          : rolesStr.toasts.created(form.getValues('name'))
      )
      await queryClient.invalidateQueries({ queryKey: ['roles'] })
      onClose()
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : rolesStr.errors.saveFailed),
  })

  const selected = form.watch('functions')

  const toggle = (code: string, checked: boolean) => {
    const cur = form.getValues('functions')
    form.setValue('functions', checked ? [...cur, code] : cur.filter((c) => c !== code), {
      shouldDirty: true,
    })
  }

  const toggleGroup = (codes: string[], checked: boolean) => {
    const cur = form.getValues('functions')
    const next = checked ? [...new Set([...cur, ...codes])] : cur.filter((c) => !codes.includes(c))
    form.setValue('functions', next, { shouldDirty: true })
  }

  const { requestClose, guardNode } = useDirtyGuard(onClose, form.formState.isDirty)

  return (
    <Modal
      open={open}
      onClose={requestClose}
      title={isEdit ? rolesStr.dialog.editTitle : rolesStr.dialog.createTitle}
      width="max-w-lg"
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

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="role-name">{rolesStr.dialog.name}</Label>
          <Input
            id="role-name"
            autoFocus
            maxLength={128}
            placeholder={rolesStr.dialog.namePlaceholder}
            {...form.register('name')}
          />
          {form.formState.errors.name && (
            <p className="text-xs text-danger">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="role-description">{rolesStr.dialog.description}</Label>
          <Input
            id="role-description"
            maxLength={512}
            placeholder={rolesStr.dialog.descriptionPlaceholder}
            {...form.register('description')}
          />
          {form.formState.errors.description && (
            <p className="text-xs text-danger">{form.formState.errors.description.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label>{rolesStr.dialog.permissions}</Label>
            <span className="text-[11px] text-muted-foreground">
              {rolesStr.dialog.selectedCount(selected.length)}
            </span>
          </div>
          <div className="max-h-64 overflow-y-auto rounded-md border border-border">
            {permissions.isLoading ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                {rolesStr.dialog.permissionsLoading}
              </p>
            ) : permissions.isError ? (
              <div className="flex items-center justify-between gap-3 px-3 py-2">
                <p className="text-xs text-danger">{rolesStr.dialog.permissionsFailed}</p>
                <Button size="sm" variant="outline" onClick={() => permissions.refetch()}>
                  {rolesStr.retry}
                </Button>
              </div>
            ) : groups.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                {rolesStr.dialog.permissionsEmpty}
              </p>
            ) : (
              groups.map((g) => {
                const selectedInGroup = g.codes.filter((c) => selected.includes(c))
                const all = g.codes.length > 0 && selectedInGroup.length === g.codes.length
                const partial = selectedInGroup.length > 0 && !all
                return (
                  <div key={g.domain} className="border-b border-border last:border-b-0">
                    <label className="flex cursor-pointer select-none items-center gap-2 bg-elevated px-3 py-1.5 text-xs font-medium text-foreground hover:bg-hover">
                      <input
                        type="checkbox"
                        className="accent-primary"
                        checked={all}
                        ref={(el) => {
                          if (el) el.indeterminate = partial
                        }}
                        onChange={(e) => toggleGroup(g.codes, e.target.checked)}
                      />
                      {g.label}
                      <span className="font-normal text-muted-foreground">
                        {rolesStr.dialog.groupCount(selectedInGroup.length, g.codes.length)}
                      </span>
                    </label>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 px-3 py-2 sm:grid-cols-3">
                      {g.codes.map((code) => (
                        <label
                          key={code}
                          className="flex cursor-pointer items-center gap-1.5 text-xs text-foreground"
                        >
                          <input
                            type="checkbox"
                            className="accent-primary"
                            checked={selected.includes(code)}
                            onChange={(e) => toggle(code, e.target.checked)}
                          />
                          <span className="font-mono">{code}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })
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
            {rolesStr.dialog.cancel}
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Spinner />}
            {isEdit
              ? mutation.isPending
                ? rolesStr.dialog.saving
                : rolesStr.dialog.save
              : mutation.isPending
                ? rolesStr.dialog.submitting
                : rolesStr.dialog.submit}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
