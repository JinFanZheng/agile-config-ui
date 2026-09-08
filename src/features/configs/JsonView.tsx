import Editor, { DiffEditor, type OnMount } from '@monaco-editor/react'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { getJson, saveJson } from '../../api/configs'
import { ChevronsDownUp, ChevronsUpDown, Cloud, GitCompare, Info } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Tooltip } from '../../components/ui/tooltip'
import { Spinner } from '../../components/ui/spinner'
import { usePermission } from '../../hooks/usePermission'
import { ApiError } from '../../lib/http'
import { PERMISSION } from '../../lib/permissions'
import { buildOnlineJsonText, diffJsonCounts, parseJsoncToEntries } from '../../lib/jsonDiff'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { applyMonacoTheme, DIFF_EDITOR_OPTIONS } from '../../lib/monaco'
import { isDarkTheme } from '../../lib/themes'
import { useSettingsStore } from '../../stores/settings'
import { toast } from '../../stores/toast'
import { configsStr } from '../../strings/configs'

/** JSON 视图（jsonc 含描述注释）；本模块由 ConfigPage 懒加载，monaco 独立分包 */
export function JsonView({
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
  const theme = useSettingsStore((s) => s.resolvedTheme)
  const editorFontSize = useSettingsStore((s) => s.editorFontSize)
  const editorWordWrap = useSettingsStore((s) => s.editorWordWrap)
  const [text, setText] = useState<string | null>(null)
  const [savedText, setSavedText] = useState('')
  const [patch, setPatch] = useState(true)
  const [saving, setSaving] = useState(false)
  const [diffTarget, setDiffTarget] = useState<'saved' | 'online' | null>(null)
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null)
  const { can } = usePermission()

  const isDark = isDarkTheme(theme)
  // 窄屏（<768px）Diff 切 inline 单栏：并排两栏在手机宽度不可读（ITER-17）
  const isNarrow = useMediaQuery('(max-width: 767px)')
  useEffect(() => {
    applyMonacoTheme(isDark)
  }, [isDark, text])

  const query = useQuery({
    queryKey: ['configs', 'json', appId, env, reloadKey],
    queryFn: () => getJson(appId, env),
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
      await saveJson(appId, env, text, patch)
      setSavedText(text)
      toast.success(configsStr.toasts.jsonSaved)
      onSaved?.()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : configsStr.toasts.failed)
    } finally {
      setSaving(false)
    }
  }

  const dirty = text !== null && text !== savedText

  // jsonc → 扁平有序条目（与线上快照同构），解析失败返回 null
  const editorEntries = useMemo(() => parseJsoncToEntries(text ?? ''), [text])
  const savedEntries = useMemo(() => parseJsoncToEntries(savedText), [savedText])
  // 对比线上：编辑器 vs 线上快照，removed 恒计（若发布，线上将移除）
  const onlineCounts = useMemo(() => {
    if (!onlineValues || !editorEntries) return null
    return diffJsonCounts(editorEntries, onlineValues, true)
  }, [editorEntries, onlineValues])
  // 对比已保存：编辑器 vs 已保存；全量模式（未勾补丁）额外计 removed
  const unsavedCounts = useMemo(() => {
    if (!dirty || !editorEntries || !savedEntries) return null
    return diffJsonCounts(editorEntries, new Map(savedEntries), !patch)
  }, [dirty, editorEntries, savedEntries, patch])
  const activeCounts = diffTarget === 'online' ? onlineCounts : unsavedCounts
  const countTotal = (c?: { added: number; changed: number; removed: number } | null) =>
    (c?.added ?? 0) + (c?.changed ?? 0) + (c?.removed ?? 0)

  // 线上侧文本按编辑器键序重建，保证 DiffEditor 两侧行对齐
  const onlineJsonText = useMemo(() => {
    if (!onlineValues) return ''
    return buildOnlineJsonText(onlineValues, editorEntries?.map(([k]) => k) ?? [])
  }, [onlineValues, editorEntries])

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
        <p className="text-xs text-danger">{configsStr.jsonView.loadError}</p>
        <Button size="sm" variant="outline" onClick={() => query.refetch()}>
          {configsStr.jsonView.reload}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-panel shadow-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {configsStr.jsonView.editing}
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
        </span>
        <div className="flex-1" />
        {diffTarget && countTotal(activeCounts) > 0 && (
          <span className="rounded-full bg-info/10 px-2 py-0.5 font-mono text-[10px] text-info">
            {configsStr.diffBar.summary(activeCounts!.added, activeCounts!.changed, activeCounts!.removed)}
          </span>
        )}
        {!patch && (unsavedCounts?.removed ?? 0) > 0 && (
          <span className="rounded bg-danger/10 px-2 py-0.5 text-[10px] font-medium text-danger">
            {configsStr.diffBar.fullWarning(unsavedCounts!.removed)}
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
        {!diffTarget && (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => editorRef.current?.getAction('editor.foldAll')?.run()}
              title={configsStr.jsonView.foldAll}
            >
              <ChevronsDownUp className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => editorRef.current?.getAction('editor.unfoldAll')?.run()}
              title={configsStr.jsonView.unfoldAll}
            >
              <ChevronsUpDown className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            className="accent-primary"
            checked={patch}
            onChange={(e) => setPatch(e.target.checked)}
          />
          {configsStr.jsonView.patch}
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
          {configsStr.jsonView.reload}
        </Button>
        <Button size="sm" onClick={save} disabled={!dirty || saving || !can(PERMISSION.ConfigEdit)}>
          {saving && <Spinner />}
          {saving ? configsStr.jsonView.saving : configsStr.jsonView.save}
        </Button>
      </div>
      {diffTarget ? (
        <div className="min-h-0 flex-1" data-testid="json-diff-editor">
          <DiffEditor
            key={isNarrow ? 'inline' : 'split'}
            height="100%"
            language="json"
            theme="agile"
            original={diffTarget === 'online' ? onlineJsonText : savedText}
            modified={text ?? ''}
            options={{ ...DIFF_EDITOR_OPTIONS, fontSize: editorFontSize, renderSideBySide: !isNarrow, wordWrap: editorWordWrap ? 'on' : 'off' }}
          />
        </div>
      ) : (
        <div className="min-h-0 flex-1" data-testid="json-editor-wrap">
          <Editor
            height="100%"
            language="json"
            theme="agile"
            onMount={(ed) => (editorRef.current = ed)}
            value={text ?? ''}
            onChange={(v) => setText(v ?? '')}
            options={{
              minimap: { enabled: false },
              fontSize: editorFontSize,
              wordWrap: editorWordWrap ? 'on' : 'off',
              lineNumbersMinChars: 3,
              scrollBeyondLastLine: false,
              tabSize: 2,
              automaticLayout: true,
              fontFamily: "'JetBrains Mono Variable', ui-monospace, Menlo, monospace",
            }}
          />
        </div>
      )}
    </div>
  )
}
