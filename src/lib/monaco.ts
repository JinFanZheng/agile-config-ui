import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'

// 内网工具：monaco 走本地打包（默认 CDN loader 不可依赖）；worker 由 Vite 打包
self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    if (label === 'json') return new jsonWorker()
    return new editorWorker()
  },
}

loader.config({ monaco })

// AgileConfig 的 JSON 视图是 jsonc：注释承载 description 字段，保存时服务端解析回写。
// 放开 monaco 的 JSON 诊断对注释的报错。
monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
  allowComments: true,
  schemaValidation: 'error',
})

/** 从当前主题令牌生成 monaco 主题（亮/暗两套，随 html[data-theme] 变化重新定义） */
export function applyMonacoTheme(dark: boolean) {
  const cs = getComputedStyle(document.documentElement)
  const v = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback
  monaco.editor.defineTheme('agile', {
    base: dark ? 'vs-dark' : 'vs',
    inherit: true,
    rules: [{ token: 'comment', foreground: v('--text-secondary', '888888'), fontStyle: 'italic' }],
    colors: {
      'editor.background': v('--bg-panel', dark ? '#0f1e36' : '#ffffff'),
      'editor.foreground': v('--text-primary', dark ? '#dbe7f8' : '#09090b'),
      'editorLineNumber.foreground': v('--text-secondary', '888888'),
      'editor.lineHighlightBackground': v('--bg-hover', dark ? '#15294a' : '#f4f4f5'),
      'editorGutter.background': v('--bg-panel', '#ffffff'),
      'editorWidget.background': v('--bg-elevated', '#fafafa'),
      'editorWidget.border': v('--border-default', '#e4e4e7'),
    },
  })
  monaco.editor.setTheme('agile')
}

/** DiffEditor 共享选项：只读、并排、折叠未变更区；关掉概览标尺（diff 标记条会混进滚动条区域，观感像渲染错误） */
export const DIFF_EDITOR_OPTIONS = {
  readOnly: true,
  renderSideBySide: true,
  renderOverviewRuler: false,
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
} as const

export { monaco }
