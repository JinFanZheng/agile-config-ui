import Editor, { DiffEditor, type OnMount } from '@monaco-editor/react'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { getJson, saveJson } from '../../api/configs'
import { ChevronsDownUp, ChevronsUpDown, GitCompare } from 'lucide-react'
import { Info } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Tooltip } from '../../components/ui/tooltip'
import { Spinner } from '../../components/ui/spinner'
import { usePermission } from '../../hooks/usePermission'
import { ApiError } from '../../lib/http'
import { PERMISSION } from '../../lib/permissions'
import { applyMonacoTheme } from '../../lib/monaco'
import { useThemeStore } from '../../stores/theme'
import { toast } from '../../stores/toast'
import { configsStr } from '../../strings/configs'

/** JSON 视图（jsonc 含描述注释）；本模块由 ConfigPage 懒加载，monaco 独立分包 */
export function JsonView({
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
  const theme = useThemeStore((s) => s.theme)
  const [text, setText] = useState<string | null>(null)
  const [savedText, setSavedText] = useState('')
  const [patch, setPatch] = useState(true)
  const [saving, setSaving] = useState(false)
  const [diffMode, setDiffMode] = useState(false)
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null)
  const { can } = usePermission()

  const isDark = theme === 'navy-console'
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

  const dirty = text !== null && text !== savedText

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
        <Button
          size="sm"
          variant={diffMode ? 'default' : 'ghost'}
          onClick={() => setDiffMode((v) => !v)}
        >
          <GitCompare className="h-3.5 w-3.5" />
          {configsStr.jsonView.diffToggle}
        </Button>
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
      <div className="min-h-0 flex-1" data-testid="json-editor-wrap">
        {diffMode ? (
          <DiffEditor
            height="100%"
            language="json"
            theme="agile"
            original={savedText}
            modified={text ?? ''}
            options={{
              readOnly: true,
              renderSideBySide: true,
              fontSize: 12,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              fontFamily: "'JetBrains Mono Variable', ui-monospace, Menlo, monospace",
            }}
          />
        ) : (
        <Editor
          height="100%"
          language="json"
          theme="agile"
          onMount={(ed) => (editorRef.current = ed)}
          value={text ?? ''}
          onChange={(v) => setText(v ?? '')}
          options={{
            minimap: { enabled: false },
            fontSize: 12,
            lineNumbersMinChars: 3,
            scrollBeyondLastLine: false,
            tabSize: 2,
            automaticLayout: true,
            fontFamily: "'JetBrains Mono Variable', ui-monospace, Menlo, monospace",
          }}
        />
        )}
      </div>
    </div>
  )
}
