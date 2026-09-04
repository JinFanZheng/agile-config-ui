import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { getKvList, saveKvList } from '../../api/configs'
import { Button } from '../../components/ui/button'
import { Spinner } from '../../components/ui/spinner'
import { ApiError } from '../../lib/http'
import { toast } from '../../stores/toast'
import { configsStr } from '../../strings/configs'

/** KV 文本视图：key=value 行文本，保存走 SaveKvList（默认补丁模式只提交差异） */
export function KvView({
  appId,
  env,
  onDirtyChange,
  onSaved,
  reloadKey,
}: {
  appId: string
  env: string
  onDirtyChange: (dirty: boolean) => void
  onSaved?: () => void
  reloadKey: number
}) {
  const [text, setText] = useState<string | null>(null)
  const [savedText, setSavedText] = useState('')
  const [patch, setPatch] = useState(true)
  const [saving, setSaving] = useState(false)

  const query = useQuery({
    queryKey: ['configs', 'kv', appId, env, reloadKey],
    queryFn: () => getKvList(appId, env),
  })

  useEffect(() => {
    if (query.data !== undefined && text === null) {
      setText(query.data)
      setSavedText(query.data)
    }
  }, [query.data, text])

  useEffect(() => {
    onDirtyChange(text !== null && text !== savedText)
  }, [text, savedText, onDirtyChange])

  const save = async () => {
    if (text === null) return
    setSaving(true)
    try {
      await saveKvList(appId, env, text, patch)
      setSavedText(text)
      toast.success(configsStr.toasts.kvSaved)
      onSaved?.()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : configsStr.toasts.failed)
    } finally {
      setSaving(false)
    }
  }

  if (query.isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-panel text-xs text-muted-foreground">
        <Spinner /> 加载中…
      </div>
    )
  }
  if (query.isError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-border bg-panel">
        <p className="text-xs text-danger">{configsStr.kv.loadError}</p>
        <Button size="sm" variant="outline" onClick={() => query.refetch()}>
          {configsStr.kv.reload}
        </Button>
      </div>
    )
  }

  const dirty = text !== null && text !== savedText

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-panel shadow-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <span className="font-mono text-xs text-muted-foreground">key=value · 每行一条</span>
        <div className="flex-1" />
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input type="checkbox" className="accent-primary" checked={patch} onChange={(e) => setPatch(e.target.checked)} />
          {configsStr.kv.patch}
        </label>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setText(query.data ?? '')
            setSavedText(query.data ?? '')
          }}
        >
          {configsStr.kv.reload}
        </Button>
        <Button size="sm" onClick={save} disabled={!dirty || saving}>
          {saving && <Spinner />}
          {saving ? configsStr.kv.saving : configsStr.kv.save}
        </Button>
      </div>
      <textarea
        value={text ?? ''}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
        className="min-h-0 flex-1 resize-none bg-transparent px-4 py-3 font-mono text-xs leading-relaxed text-foreground outline-none"
        aria-label="KV 文本"
      />
    </div>
  )
}
