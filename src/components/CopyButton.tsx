import { Check, Copy } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '../lib/utils'

/** 一键复制（UX #6：AppId/Secret 复制），1.2s 内显示已复制反馈 */
export function CopyButton({
  value,
  label,
  className,
}: {
  value: string
  label?: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => () => clearTimeout(timer.current), [])

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      // 剪贴板 API 不可用（如非安全上下文）时退化为选中提示
      const ta = document.createElement('textarea')
      ta.value = value
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
    <button
      type="button"
      onClick={onCopy}
      title={label}
      className={cn(
        'inline-flex h-5 w-5 items-center gap-1 rounded px-0.5 text-muted-foreground transition-colors duration-150 ease-out',
        'hover:bg-hover hover:text-foreground',
        className
      )}
    >
      {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
    </button>
  )
}
