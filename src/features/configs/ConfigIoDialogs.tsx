import { useMutation, useQuery } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import {
  previewConfigJsonFile,
  syncEnv,
  exportConfigJson,
  type JsonFilePreviewItem,
} from '../../api/importExport'
import { addConfigsRange } from '../../api/configs'
import { getSys } from '../../api/ops'
import { Info } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Tooltip } from '../../components/ui/tooltip'
import { Modal } from '../../components/ui/modal'
import { Spinner } from '../../components/ui/spinner'
import { ApiError } from '../../lib/http'
import { usePermission } from '../../hooks/usePermission'
import { PERMISSION } from '../../lib/permissions'
import { toast } from '../../stores/toast'
import { configsStr } from '../../strings/configs'

/** 配置 JSON 导入（PreViewJsonFile 预览 → AddRange 落库，导入后待发布） */
export function JsonImportDialog({
  open,
  appId,
  env,
  onClose,
  onDone,
}: {
  open: boolean
  appId: string
  env: string
  onClose: () => void
  onDone: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<JsonFilePreviewItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const close = () => {
    setItems(null)
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
    onClose()
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const list = (items ?? []).map((i) => ({
        appId,
        group: i.group,
        key: i.key,
        value: i.value,
        description: i.description,
      }))
      await addConfigsRange(list, env)
    },
    onSuccess: () => {
      toast.success(configsStr.toasts2.imported)
      onDone()
      close()
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : '导入失败'),
  })

  return (
    <Modal open={open} onClose={close} title={configsStr.io.importTitle} width="max-w-lg">
      <div className="flex flex-col gap-3">
        {error && (
          <div role="alert" className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {configsStr.io.importHint}
          <Tooltip
            placement="bottom"
            content={
              <span>
                <span className="mb-1 block font-medium text-foreground">
                  {configsStr.io.typeNotesTitle}
                </span>
                {configsStr.io.typeNotes.map((t) => (
                  <span key={t} className="mb-0.5 block">
                    · {t}
                  </span>
                ))}
              </span>
            }
          >
            <Info className="h-3.5 w-3.5 cursor-help text-muted-foreground/70 hover:text-foreground" />
          </Tooltip>
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".json,.jsonc,application/json"
          aria-label={configsStr.io.importJson}
          onChange={async (e) => {
            const f = e.target.files?.[0]
            setItems(null)
            setError(null)
            if (!f) return
            try {
              setItems(await previewConfigJsonFile(f))
            } catch (err) {
              setError(err instanceof ApiError ? err.message : '文件读取失败')
            }
          }}
          className="text-xs text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-elevated file:px-3 file:py-1.5 file:text-xs file:text-foreground"
        />

        {items && items.length === 0 && (
          <p className="rounded-md border border-border bg-input/40 px-3 py-2 text-xs text-muted-foreground">
            {configsStr.io.previewEmpty}
          </p>
        )}
        {items && items.length > 0 && (
          <div className="max-h-56 overflow-y-auto rounded-md border border-border">
            <div className="border-b border-border bg-elevated px-3 py-1.5 text-xs text-muted-foreground">
              {configsStr.io.importItems(items.length)}
            </div>
            {items.map((i, idx) => (
              <div key={idx} className="flex items-baseline gap-2 border-b border-border px-3 py-1 text-xs last:border-b-0">
                <span className="shrink-0 font-mono text-muted-foreground">
                  {i.group ? `${i.group}:${i.key}` : i.key}
                </span>
                <span className="min-w-0 flex-1 truncate font-mono">{i.value}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={close} disabled={mutation.isPending}>
            取消
          </Button>
          <Button disabled={!items?.length || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Spinner />}
            {mutation.isPending ? configsStr.io.importing : configsStr.io.importConfirm}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

/** 环境间同步：把当前环境配置覆盖到所选目标环境 */
export function SyncEnvDialog({
  open,
  appId,
  currentEnv,
  onClose,
  onDone,
}: {
  open: boolean
  appId: string
  currentEnv: string
  onClose: () => void
  onDone: () => void
}) {
  const [targets, setTargets] = useState<Set<string>>(new Set())
  const sys = useQuery({ queryKey: ['ops', 'sys'], queryFn: getSys, staleTime: 5 * 60_000 })
  const envList = (sys.data?.envList?.length ? sys.data.envList : ['DEV', 'TEST', 'PROD']).filter(
    (e) => e !== currentEnv
  )

  const mutation = useMutation({
    mutationFn: () => syncEnv(appId, currentEnv, [...targets]),
    onSuccess: () => {
      toast.success(configsStr.toasts2.synced([...targets].join('、')))
      setTargets(new Set())
      onDone()
      onClose()
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : '同步失败'),
  })

  return (
    <>
      <Modal open={open} onClose={onClose} title={configsStr.io.syncTitle} width="max-w-sm">
        <div className="flex flex-col gap-3">
          <p className="text-xs leading-relaxed text-muted-foreground">{configsStr.io.syncHint(currentEnv)}</p>
          {envList.length === 0 ? (
            <p className="text-xs text-muted-foreground">{configsStr.io.noOtherEnv}</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {envList.map((e) => (
                <label key={e} className="flex cursor-pointer items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={targets.has(e)}
                    onChange={(ev) =>
                      setTargets((prev) => {
                        const next = new Set(prev)
                        if (ev.target.checked) next.add(e)
                        else next.delete(e)
                        return next
                      })
                    }
                  />
                  <span className="font-mono">{e}</span>
                </label>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
              取消
            </Button>
            <Button
              variant="danger"
              disabled={targets.size === 0 || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending && <Spinner />}
              {mutation.isPending ? configsStr.io.syncing : configsStr.io.syncConfirm}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

/** 导出当前应用当前环境的 JSON（按钮封装） */
export function ExportJsonButton({ appId, env }: { appId: string; env: string }) {
  const { can } = usePermission()
  if (!can(PERMISSION.ConfigRead)) return null
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={async () => {
        try {
          await exportConfigJson(appId, env)
        } catch (e) {
          toast.error(e instanceof ApiError ? e.message : '导出失败')
        }
      }}
    >
      {configsStr.io.exportJson}
    </Button>
  )
}
