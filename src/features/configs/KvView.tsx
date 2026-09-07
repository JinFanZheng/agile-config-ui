import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { DiffEditor } from '@monaco-editor/react'
import { getKvList, saveKvList } from '../../api/configs'
import { Cloud, GitCompare, Info } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Tooltip } from '../../components/ui/tooltip'
import { Spinner } from '../../components/ui/spinner'
import { usePermission } from '../../hooks/usePermission'
import { ApiError } from '../../lib/http'
import { diffKv, diffKvVsMap, parseKv, type KvDiff } from '../../lib/kvDiff'
import { applyMonacoTheme, DIFF_EDITOR_OPTIONS } from '../../lib/monaco'
import { PERMISSION } from '../../lib/permissions'
import { useSettingsStore } from '../../stores/settings'
import { toast } from '../../stores/toast'
import { configsStr } from '../../strings/configs'

/** KV 文本视图：key=value 行文本，保存走 SaveKvList（默认补丁模式只提交差异） */
export function KvView({
  appId,
  env,
  onDirtyChange,
  onSaved,
  reloadKey,
  onlineValues,
}: {
  appId: string
  env: string
  onDirtyChange: (dirty: boolean) => void
  onSaved?: () => void
  reloadKey: number
  /** 线上最新发布版 key→value 快照（key 格式 group:key）；null=无发布史 */
  onlineValues: Map<string, string> | null
}) {
  const [text, setText] = useState<string | null>(null)
  const [savedText, setSavedText] = useState('')
  const [patch, setPatch] = useState(true)
  const [saving, setSaving] = useState(false)
  const [diffTarget, setDiffTarget] = useState<'saved' | 'online' | null>(null)
  const { can } = usePermission()

  const theme = useSettingsStore((s) => s.theme)
  const editorFontSize = useSettingsStore((s) => s.editorFontSize)
  useEffect(() => {
    applyMonacoTheme(theme === 'navy-console')
  }, [theme])

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

  // Esc 退出 diff 视图
  useEffect(() => {
    if (!diffTarget) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDiffTarget(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [diffTarget])

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

  // diff 视图两侧都按 key 排序归一化（与摘要计数同源），避免行序差异产生噪音
  const toSortedKv = (t: string) =>
    [...parseKv(t)]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n')
  const onlineKvText = useMemo(
    () =>
      onlineValues
        ? [...onlineValues.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}=${v}`)
            .join('\n')
        : '',
    [onlineValues]
  )
  const editorKvText = useMemo(() => toSortedKv(text ?? ''), [text])
  const savedKvText = useMemo(() => toSortedKv(savedText), [savedText])

  const dirty = text !== null && text !== savedText
  const onlineDiff: KvDiff | null =
    text !== null && onlineValues ? diffKvVsMap(text, onlineValues) : null
  const unsavedDiff: KvDiff | null =
    dirty && text !== null ? diffKv(text, savedText, !patch) : null
  const activeCounts = diffTarget === 'online' ? onlineDiff?.counts : unsavedDiff?.counts
  const countTotal = (c?: { added: number; changed: number; removed: number }) =>
    (c?.added ?? 0) + (c?.changed ?? 0) + (c?.removed ?? 0)

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

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-panel shadow-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <span className="font-mono text-xs text-muted-foreground">key=value · 每行一条</span>
        <div className="flex-1" />
        {countTotal(activeCounts) > 0 && (
          <span className="rounded-full bg-info/10 px-2 py-0.5 font-mono text-[10px] text-info">
            {configsStr.diffBar.summary(activeCounts!.added, activeCounts!.changed, activeCounts!.removed)}
          </span>
        )}
        {diffTarget && (
          <span className="text-[10px] text-muted-foreground">{configsStr.diffBar.sortedNote}</span>
        )}
        {!patch && (unsavedDiff?.counts.removed ?? 0) > 0 && (
          <span className="rounded bg-danger/10 px-2 py-0.5 text-[10px] font-medium text-danger">
            {configsStr.diffBar.fullWarning(unsavedDiff!.counts.removed)}
          </span>
        )}
        <Button
          size="sm"
          variant={diffTarget === 'saved' ? 'default' : 'ghost'}
          onClick={() => setDiffTarget((t) => (t === 'saved' ? null : 'saved'))}
        >
          <GitCompare className="h-3.5 w-3.5" />
          {configsStr.diffBar.compare.saved}
        </Button>
        <Button
          size="sm"
          variant={diffTarget === 'online' ? 'default' : 'ghost'}
          onClick={() => setDiffTarget((t) => (t === 'online' ? null : 'online'))}
          disabled={!onlineValues}
        >
          <Cloud className="h-3.5 w-3.5" />
          {configsStr.diffBar.compare.online}
        </Button>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            className="accent-primary"
            checked={patch}
            onChange={(e) => setPatch(e.target.checked)}
          />
          {configsStr.kv.patch}
          <Tooltip
            placement="bottom"
            content={
              <span>
                {configsStr.patchTip.map((t) => (
                  <span key={t} className="mb-0.5 block">
                    · {t}
                  </span>
                ))}
              </span>
            }
          >
            <Info className="h-3.5 w-3.5 cursor-help text-muted-foreground/70 hover:text-foreground" />
          </Tooltip>
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
        <Button size="sm" onClick={save} disabled={!dirty || saving || !can(PERMISSION.ConfigEdit)}>
          {saving && <Spinner />}
          {saving ? configsStr.kv.saving : configsStr.kv.save}
        </Button>
      </div>
      {diffTarget ? (
        <div className="min-h-0 flex-1" data-testid="kv-diff-editor">
          <DiffEditor
            height="100%"
            language="plaintext"
            theme="agile"
            original={diffTarget === 'online' ? onlineKvText : savedKvText}
            modified={editorKvText}
            options={{ ...DIFF_EDITOR_OPTIONS, fontSize: editorFontSize }}
          />
        </div>
      ) : (
        <textarea
          value={text ?? ''}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          className="min-h-0 flex-1 resize-none bg-transparent px-4 py-3 font-mono leading-relaxed text-foreground outline-none"
          style={{ fontSize: editorFontSize }}
          aria-label="KV 文本"
        />
      )}
    </div>
  )
}
