import { Check, Copy } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { guideStr } from '../../strings/guide'

/**
 * 接入指南代码块（ITER-10）：纯文本渲染 + 一键复制。
 * - 代码只作为 React 文本节点输出（<pre><code>{code}</code></pre>），无任何语法高亮 / markdown / HTML 运行时
 * - 复制按交互规范 §4 用内联反馈（按钮变「已复制」✓，1.2s 复原），不发 Toast
 */
export function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      // 剪贴板 API 不可用（如非安全上下文）时退化为 execCommand
      const ta = document.createElement('textarea')
      ta.value = code
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 1200)
  }

  return (
    <figure
      data-testid="guide-code"
      className="overflow-hidden rounded-lg border border-border bg-elevated"
    >
      <figcaption className="flex items-center justify-between gap-2 border-b border-border px-3 py-1">
        <span className="font-mono text-[11px] text-muted-foreground">{lang}</span>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors duration-150 ease-out hover:bg-hover hover:text-foreground"
        >
          {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
          {copied ? guideStr.code.copied : guideStr.code.copy}
        </button>
      </figcaption>
      <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </figure>
  )
}
