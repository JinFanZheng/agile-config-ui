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

export { monaco }
