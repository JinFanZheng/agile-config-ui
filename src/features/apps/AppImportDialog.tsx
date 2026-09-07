import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { importApps, previewAppImport, type AppImportPreview } from '../../api/importExport'
import { Button } from '../../components/ui/button'
import { Modal } from '../../components/ui/modal'
import { Spinner } from '../../components/ui/spinner'
import { ApiError } from '../../lib/http'
import { toast } from '../../stores/toast'
import { appsStr } from '../../strings/apps'

/**
 * 应用导入（两段式）：选文件 → PreviewImport 校验（展示将导入的应用与错误）→ 确认导入。
 * 权限与导出一致走 APP_ADD（服务端语义）。
 */
export function AppImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<AppImportPreview | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setFile(null)
    setPreview(null)
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }
  const close = () => {
    reset()
    onClose()
  }

  const doPreview = async () => {
    if (!file) return
    setError(null)
    setPreview(null)
    try {
      setPreview(await previewAppImport(file))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '文件读取失败')
    }
  }

  const doImport = useMutation({
    mutationFn: () => importApps(file!),
    onSuccess: async () => {
      toast.success(appsStr.toasts.imported)
      await queryClient.invalidateQueries({ queryKey: ['apps'] })
      close()
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : '导入失败'),
  })

  const ok = preview && preview.errors.length === 0 && preview.apps.length > 0

  return (
    <Modal open={open} onClose={close} title={appsStr.importDialog.title} width="max-w-lg">
      <div className="flex flex-col gap-3">
        {error && (
          <div role="alert" className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}
        <p className="text-xs text-muted-foreground">{appsStr.importDialog.hint}</p>

        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          aria-label={appsStr.importDialog.choose}
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null)
            setPreview(null)
            setError(null)
          }}
          className="text-xs text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-elevated file:px-3 file:py-1.5 file:text-xs file:text-foreground"
        />

        {preview && preview.errors.length > 0 && (
          <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2">
            <p className="text-xs font-medium text-danger">{appsStr.importDialog.errors}</p>
            <ul className="mt-1 list-disc pl-4 text-xs text-danger/90">
              {preview.errors.slice(0, 5).map((e, i) => (
                <li key={i} className="break-all">{e}</li>
              ))}
            </ul>
          </div>
        )}

        {ok && (
          <div className="rounded-md border border-border bg-input/40 px-3 py-2">
            <p className="text-xs text-foreground">{appsStr.importDialog.apps(preview.apps.length)}</p>
            <ul className="mt-1 space-y-0.5">
              {preview.apps.map((a) => (
                <li key={a.appId} className="flex items-center gap-2 text-xs">
                  <span className="rounded bg-success/10 px-1 py-0.5 text-[10px] text-success">新增</span>
                  <span className="truncate">{a.name}</span>
                  <span className="truncate font-mono text-muted-foreground">{a.appId}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={close} disabled={doImport.isPending}>
            取消
          </Button>
          <Button variant="outline" disabled={!file} onClick={doPreview}>
            {appsStr.importDialog.preview}
          </Button>
          <Button disabled={!ok || doImport.isPending} onClick={() => doImport.mutate()}>
            {doImport.isPending && <Spinner />}
            {doImport.isPending ? appsStr.importDialog.importing : appsStr.importDialog.importConfirm}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
