import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { useToastStore, type ToastKind } from '../stores/toast'
import { cn } from '../lib/utils'

const ICONS: Record<ToastKind, typeof Info> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
}

/** 全局 Toast 容器（挂载于 App 根部；最多同屏 3 条，2.6s 自动消失） */
export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  if (toasts.length === 0) return null
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-4 bottom-4 z-[80] flex flex-col items-end gap-2"
    >
      {toasts.map(({ id, kind, text }) => {
        const Icon = ICONS[kind]
        return (
          <div
            key={id}
            role="status"
            className={cn(
              'anim-toast pointer-events-auto flex max-w-sm items-center gap-2 rounded-md border px-3 py-2 text-xs shadow-overlay',
              kind === 'success' && 'border-success/40 bg-panel text-success',
              kind === 'error' && 'border-danger/40 bg-panel text-danger',
              kind === 'info' && 'border-border bg-panel text-foreground'
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="text-foreground">{text}</span>
            <button
              type="button"
              aria-label="关闭提示"
              onClick={() => dismiss(id)}
              className="ml-1 rounded p-0.5 text-muted-foreground transition-colors duration-150 hover:bg-hover hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
