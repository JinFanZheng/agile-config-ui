import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { addApp, editApp, getAppGroups, getInheritancedApps, type AppItem } from '../../api/apps'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Modal } from '../../components/ui/modal'
import { Spinner } from '../../components/ui/spinner'
import { generateAppId } from '../../lib/appId'
import { ApiError } from '../../lib/http'
import { cn } from '../../lib/utils'
import { appsStr } from '../../strings/apps'
import { appInputSchema, type AppInputValues } from './schema'

interface AppDialogProps {
  open: boolean
  /** 编辑对象；null = 新建 */
  app: AppItem | null
  onClose: () => void
}

/** 新建/编辑应用：新建时自动生成 AppId（UX #6），编辑时 ID 不可变 */
export function AppDialog({ open, app, onClose }: AppDialogProps) {
  const isEdit = app !== null
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const form = useForm<AppInputValues>({
    resolver: zodResolver(appInputSchema),
    defaultValues: {
      name: '',
      id: '',
      group: '',
      enabled: true,
      inheritanced: false,
      inheritancedApps: [],
    },
  })

  // 打开时重置：新建 → 自动生成 ID；编辑 → 预填
  useEffect(() => {
    if (!open) return
    setError(null)
    if (app) {
      form.reset({
        name: app.name,
        id: app.id,
        group: app.group ?? '',
        enabled: app.enabled,
        inheritanced: app.inheritanced,
        inheritancedApps: app.inheritancedApps ?? [],
      })
    } else {
      form.reset({
        name: '',
        id: generateAppId(),
        group: '',
        enabled: true,
        inheritanced: false,
        inheritancedApps: [],
      })
    }
  }, [open, app, form])

  const groups = useQuery({
    queryKey: ['apps', 'groups'],
    queryFn: getAppGroups,
    enabled: open,
    staleTime: 60_000,
  })

  const inheritable = useQuery({
    queryKey: ['apps', 'inheritable', app?.id ?? ''],
    queryFn: () => getInheritancedApps(app?.id),
    enabled: open,
    staleTime: 60_000,
  })

  const mutation = useMutation({
    mutationFn: (values: AppInputValues) =>
      isEdit ? editApp({ ...values }) : addApp({ ...values }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['apps'] })
      onClose()
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : '保存失败'),
  })

  const inheritanced = form.watch('inheritanced')
  const selectedInherits = form.watch('inheritancedApps')

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? appsStr.dialog.editTitle : appsStr.dialog.createTitle}
    >
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
          <Label htmlFor="app-name">{appsStr.dialog.name}</Label>
          <Input
            id="app-name"
            autoFocus
            placeholder={appsStr.dialog.namePlaceholder}
            {...form.register('name')}
          />
          {form.formState.errors.name && (
            <p className="text-xs text-danger">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="app-id">{appsStr.dialog.appId}</Label>
          <Input id="app-id" className="font-mono" disabled={isEdit} {...form.register('id')} />
          <p className="text-[11px] text-muted-foreground">
            {isEdit ? form.getValues('id') : appsStr.dialog.appIdHint}
          </p>
          {form.formState.errors.id && (
            <p className="text-xs text-danger">{form.formState.errors.id.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="app-group">{appsStr.dialog.group}</Label>
          <Input
            id="app-group"
            list="app-groups"
            placeholder={appsStr.dialog.groupPlaceholder}
            {...form.register('group')}
          />
          <datalist id="app-groups">
            {(groups.data ?? []).map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
        </div>

        <div className="flex flex-col gap-2.5 rounded-md border border-border bg-input/40 px-3 py-2.5">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-foreground">
            <input type="checkbox" className="accent-primary" {...form.register('enabled')} />
            {appsStr.dialog.enabled}
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-foreground">
            <input type="checkbox" className="accent-primary" {...form.register('inheritanced')} />
            {appsStr.dialog.inheritanced}
          </label>
        </div>

        {!inheritanced && (
          <div className="flex flex-col gap-1.5">
            <Label>{appsStr.dialog.inheritancedApps}</Label>
            <p className="text-[11px] text-muted-foreground">
              {appsStr.dialog.inheritancedAppsHint}
            </p>
            <div className="max-h-32 overflow-y-auto rounded-md border border-border">
              {(inheritable.data ?? []).length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted-foreground">
                  {appsStr.dialog.inheritancedAppsEmpty}
                </p>
              ) : (
                (inheritable.data ?? []).map((a) => (
                  <label
                    key={a.id}
                    className="flex cursor-pointer items-center gap-2 border-b border-border px-3 py-1.5 text-xs text-foreground last:border-b-0 hover:bg-hover"
                  >
                    <input
                      type="checkbox"
                      className="accent-primary"
                      value={a.id}
                      checked={selectedInherits.includes(a.id)}
                      onChange={(e) => {
                        const cur = form.getValues('inheritancedApps')
                        form.setValue(
                          'inheritancedApps',
                          e.target.checked ? [...cur, a.id] : cur.filter((x) => x !== a.id)
                        )
                      }}
                    />
                    <span className="font-mono">{a.id}</span>
                    <span className="text-muted-foreground">{a.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        )}

        <div className="mt-1 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            取消
          </Button>
          <Button type="submit" disabled={mutation.isPending} className={cn()}>
            {mutation.isPending && <Spinner />}
            {isEdit
              ? mutation.isPending
                ? appsStr.dialog.saving
                : appsStr.dialog.save
              : mutation.isPending
                ? appsStr.dialog.submitting
                : appsStr.dialog.submit}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
