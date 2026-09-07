import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { DiffEditor } from '@monaco-editor/react'
import { getKvList, saveKvList } from '../../api/configs'
import { Info } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Tooltip } from '../../components/ui/tooltip'
import { Spinner } from '../../components/ui/spinner'
import { usePermission } from '../../hooks/usePermission'
import { ApiError } from '../../lib/http'
import { diffKv, diffKvVsMap, parseKv, type KvDiff, type KvDiffRow } from '../../lib/kvDiff'
import { applyMonacoTheme } from '../../lib/monaco'
import { cn } from '../../lib/utils'
import { PERMISSION } from '../../lib/permissions'
import { useThemeStore } from '../../stores/theme'
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
  const [diffTab, setDiffTab] = useState<'online' | 'unsaved'>('online')
  const { can } = usePermission()

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

  const theme = useThemeStore((s) => s.theme)
  useEffect(() => {
    applyMonacoTheme(theme === 'navy-console')
  }, [theme])

  // DiffEditor 两侧都用 parseKv 归一化并按 key 排序（与摘要计数同源），避免行序差异产生噪音
  const onlineKvText = useMemo(() => {
    if (!onlineValues) return ''
    return [...onlineValues.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n')
  }, [onlineValues])
  const editorKvText = useMemo(
    () =>
      [...parseKv(text ?? '')]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join('\n'),
    [text]
  )

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
  const onlineDiff: KvDiff | null =
    text !== null && onlineValues ? diffKvVsMap(text, onlineValues) : null
  const unsavedDiff: KvDiff | null =
    dirty && text !== null ? diffKv(text, savedText, !patch) : null
  const activeDiff = diffTab === 'online' ? onlineDiff : unsavedDiff
  // "与线上差异" tab 有差异时用 monaco DiffEditor 呈现（左=线上快照，右=编辑器，同步滚动）
  const showDiffEditor = diffTab === 'online' && (onlineDiff?.rows.length ?? 0) > 0

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-panel shadow-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <span className="font-mono text-xs text-muted-foreground">key=value · 每行一条</span>
        <div className="flex-1" />
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
      <textarea
        value={text ?? ''}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
        className="min-h-0 flex-[3] resize-none bg-transparent px-4 py-3 font-mono text-xs leading-relaxed text-foreground outline-none"
        aria-label="KV 文本"
      />

      {(onlineDiff?.rows.length || 0) + (unsavedDiff?.rows.length || 0) > 0 && (
        <div className="flex min-h-0 flex-[2] flex-col border-t border-border">
          <div className="flex flex-wrap items-center gap-2 px-4 py-1.5">
            <div className="flex items-center gap-0.5 rounded-md border border-border bg-input/40 p-0.5">
              <button
                type="button"
                onClick={() => setDiffTab('online')}
                className={cn(
                  'rounded px-2 py-0.5 text-xs transition-colors duration-150',
                  diffTab === 'online'
                    ? 'bg-selected font-medium text-selected-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {configsStr.diffBar.tabs.online}
              </button>
              {dirty && (
                <button
                  type="button"
                  onClick={() => setDiffTab('unsaved')}
                  className={cn(
                    'rounded px-2 py-0.5 text-xs transition-colors duration-150',
                    diffTab === 'unsaved'
                      ? 'bg-selected font-medium text-selected-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {configsStr.diffBar.tabs.unsaved}
                </button>
              )}
            </div>
            {activeDiff && activeDiff.rows.length > 0 && (
              <span className="rounded-full bg-info/10 px-2 py-0.5 font-mono text-[10px] text-info">
                {configsStr.diffBar.summary(activeDiff.counts.added, activeDiff.counts.changed, activeDiff.counts.removed)}
              </span>
            )}
            {showDiffEditor && (
              <span className="text-[10px] text-muted-foreground">{configsStr.diffBar.sortedNote}</span>
            )}
            {diffTab === 'unsaved' && !patch && unsavedDiff && unsavedDiff.counts.removed > 0 && (
              <span className="rounded bg-danger/10 px-2 py-0.5 text-[10px] font-medium text-danger">
                {configsStr.diffBar.fullWarning(unsavedDiff.counts.removed)}
              </span>
            )}
          </div>
          {showDiffEditor ? (
            <div className="min-h-0 flex-1" data-testid="kv-diff-editor">
              <DiffEditor
                height="100%"
                language="plaintext"
                theme="agile"
                original={onlineKvText}
                modified={editorKvText}
                options={{
                  readOnly: true,
                  renderSideBySide: true,
                  fontSize: 12,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  hideUnchangedRegions: {
                    enabled: true,
                    contextLineCount: 3,
                    minimumLineCount: 4,
                    revealLineCount: 20,
                  },
                  fontFamily: "'JetBrains Mono Variable', ui-monospace, Menlo, monospace",
                }}
              />
            </div>
          ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
            {activeDiff && activeDiff.rows.length > 0 ? (
              activeDiff.rows.map((r: KvDiffRow) => (
                <div
                  key={r.key}
                  className={cn(
                    'flex items-baseline gap-2 py-0.5 font-mono text-xs',
                    r.kind === 'removed' && 'bg-danger/5',
                    r.kind === 'added' && 'bg-info/5'
                  )}
                >
                  <span
                    className={cn(
                      'shrink-0 rounded px-1 text-[10px]',
                      r.kind === 'added' && 'bg-info/10 text-info',
                      r.kind === 'changed' && 'bg-warning/10 text-warning',
                      r.kind === 'removed' && 'bg-danger/10 text-danger'
                    )}
                  >
                    {configsStr.diffBar.kinds[r.kind]}
                  </span>
                  <span className="shrink-0 text-foreground">{r.key}</span>
                  {r.old !== undefined && (
                    <span className="truncate text-muted-foreground line-through opacity-70">{r.old}</span>
                  )}
                  {r.new !== undefined && <span className="truncate text-foreground">{r.new}</span>}
                </div>
              ))
            ) : (
              <p className="py-3 text-center text-xs text-muted-foreground">{configsStr.diffBar.empty}</p>
            )}
          </div>
          )}
        </div>
      )}
    </div>
  )
}
