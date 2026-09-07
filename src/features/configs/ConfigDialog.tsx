import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { addConfig, editConfig, getConfig, type ConfigItem } from '../../api/configs'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Modal } from '../../components/ui/modal'
import { Spinner } from '../../components/ui/spinner'
import { useDirtyGuard } from '../../hooks/useDirtyGuard'
import { ApiError } from '../../lib/http'
import { toast } from '../../stores/toast'
import { configsStr } from '../../strings/configs'
import { configInputSchema } from './schema'

interface ConfigDialogProps {
  open: boolean
  /** 编辑对象；null = 新建 */
  config: (ConfigItem & { inheritedFrom?: string }) | null
  appId: string
  env: string
  onDone: () => void
  /** 新建成功回调（清除过滤词，避免新配置被残留过滤器隐藏） */
  onCreated?: () => void
}

/** 新建/编辑配置：脏态守卫 + 并发保护（last-write-wins 下先比对服务端 updateTime） */
export function ConfigDialog({ open, config, appId, env, onDone, onCreated }: ConfigDialogProps) {
  const isEdit = config !== null
  const [error, setError] = useState<string | null>(null)
  const [concurrency, setConcurrency] = useState(false)
  const [pendingValues, setPendingValues] = useState<Record<string, unknown> | null>(null)

  const form = useForm<{ group: string; key: string; value: string; description: string }>({
    resolver: zodResolver(configInputSchema),
    defaultValues: { group: '', key: '', value: '', description: '' },
  })

  useEffect(() => {
    if (!open) return
    setError(null)
    setConcurrency(false)
    setPendingValues(null)
    form.reset(
      config
        ? {
            group: config.group ?? '',
            key: config.key,
            value: config.value,
            description: config.description ?? '',
          }
        : { group: '', key: '', value: '', description: '' }
    )
  }, [open, config, form])

  const { requestClose, guardNode } = useDirtyGuard(onDone, form.formState.isDirty)

  const mutation = useMutation({
    mutationFn: async (values: {
      group: string
      key: string
      value: string
      description: string
    }) => {
      if (isEdit) {
        // 并发保护：保存前比对服务端最新 updateTime（交互规范 §2/UX #11）
        const fresh = await getConfig(config.id, env)
        if (fresh.updateTime && config.updateTime && fresh.updateTime !== config.updateTime) {
          setPendingValues(values)
          setConcurrency(true)
          throw new Error('CONCURRENCY')
        }
        return editConfig(
          {
            id: config.id,
            appId,
            group: values.group,
            key: values.key,
            value: values.value,
            description: values.description,
          },
          env
        )
      }
      return addConfig({ appId, ...values, env }, env)
    },
    onSuccess: () => {
      toast.success(isEdit ? configsStr.toasts.saved : configsStr.toasts.created)
      if (!isEdit) onCreated?.()
      onDone()
    },
    onError: (e) => {
      if (e instanceof Error && e.message === 'CONCURRENCY') return
      setError(e instanceof ApiError ? e.message : configsStr.toasts.failed)
    },
  })

  const overwrite = async () => {
    if (!pendingValues || !config) return
    setConcurrency(false)
    try {
      await editConfig(
        {
          id: config.id,
          appId,
          group: (pendingValues.group as string) ?? '',
          key: pendingValues.key as string,
          value: pendingValues.value as string,
          description: (pendingValues.description as string) ?? '',
        },
        env
      )
      toast.success(configsStr.toasts.saved)
      onDone()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : configsStr.toasts.failed)
    }
  }

  return (
    <>
      <Modal
        open={open}
        onClose={requestClose}
        title={isEdit ? configsStr.dialog.editTitle : configsStr.dialog.createTitle}
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

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cfg-group">{configsStr.dialog.group}</Label>
              <Input
                id="cfg-group"
                placeholder={configsStr.dialog.groupPlaceholder}
                {...form.register('group')}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cfg-key">{configsStr.dialog.key}</Label>
              <Input
                id="cfg-key"
                className="font-mono"
                autoFocus
                placeholder={configsStr.dialog.keyPlaceholder}
                {...form.register('key')}
              />
              {form.formState.errors.key && (
                <p className="text-xs text-danger">{form.formState.errors.key.message}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cfg-value">{configsStr.dialog.value}</Label>
            <textarea
              id="cfg-value"
              rows={5}
              className="w-full rounded-md border border-border bg-input px-2.5 py-2 font-mono text-xs text-foreground outline-none transition-colors duration-150 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
              placeholder={configsStr.dialog.valuePlaceholder}
              {...form.register('value')}
            />
            {form.formState.errors.value && (
              <p className="text-xs text-danger">{form.formState.errors.value.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cfg-desc">{configsStr.dialog.description}</Label>
            <Input
              id="cfg-desc"
              placeholder={configsStr.dialog.descriptionPlaceholder}
              {...form.register('description')}
            />
          </div>

          <div className="mt-1 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={requestClose}
              disabled={mutation.isPending}
            >
              取消
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Spinner />}
              {isEdit
                ? mutation.isPending
                  ? configsStr.dialog.saving
                  : configsStr.dialog.save
                : mutation.isPending
                  ? configsStr.dialog.submitting
                  : configsStr.dialog.submit}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 并发冲突：覆盖 or 放弃刷新 */}
      {concurrency && config && (
        <div className="anim-overlay fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            className="anim-modal w-full max-w-sm rounded-lg border border-border bg-panel p-5 shadow-overlay"
          >
            <h2 className="text-sm font-semibold text-warning">
              {configsStr.confirm.concurrencyTitle}
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {configsStr.confirm.concurrencyBody(config.key)}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setConcurrency(false)
                  onDone()
                }}
              >
                {configsStr.confirm.concurrencyDiscard}
              </Button>
              <Button variant="danger" onClick={overwrite}>
                {configsStr.confirm.concurrencyOverwrite}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
