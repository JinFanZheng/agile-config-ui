import { useEffect } from 'react'
import { Button } from './ui/button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  body: string
  danger?: boolean
  confirmText?: string
  cancelText?: string
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** 二次确认弹窗：Esc/遮罩关闭，危险动作用 danger 语义色（UX #10 / §0 可控） */
export function ConfirmDialog({
  open,
  title,
  body,
  danger = false,
  confirmText = '确定',
  cancelText = '取消',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null
  return (
    <div
      className="anim-overlay fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="anim-modal w-full max-w-sm rounded-lg border border-border bg-panel p-5 shadow-overlay"
      >
        <h2 className={`text-sm font-semibold ${danger ? 'text-danger' : 'text-foreground'}`}>
          {title}
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{body}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            {cancelText}
          </Button>
          <Button
            variant={danger ? 'danger' : 'default'}
            onClick={onConfirm}
            disabled={busy}
            autoFocus
          >
            {busy ? '…' : confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}
