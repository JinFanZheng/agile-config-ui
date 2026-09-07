import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '../../lib/utils'

type Placement = 'top' | 'bottom' | 'left' | 'right'

const PLACEMENT_CLS: Record<Placement, string> = {
  top: 'bottom-full left-1/2 mb-1.5 -translate-x-1/2',
  bottom: 'top-full left-1/2 mt-1.5 -translate-x-1/2',
  left: 'right-full top-1/2 mr-1.5 -translate-y-1/2',
  right: 'left-full top-1/2 ml-1.5 -translate-y-1/2',
}

/**
 * 轻量 Tooltip：悬停 ~180ms 出现（防扫过误触）、移开即隐；
 * focus-visible 同样触发（键盘可达，交互规范 §6）；纯令牌配色 + anim-menu 微动效。
 * 无碰撞翻转（视口边缘场景由调用方选 placement）；内容建议 ≤3 行。
 */
export function Tooltip({
  content,
  placement = 'top',
  children,
  className,
}: {
  content: ReactNode
  placement?: Placement
  children: ReactNode
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => () => clearTimeout(timer.current), [])

  const enter = () => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setOpen(true), 180)
  }
  const leave = () => {
    clearTimeout(timer.current)
    setOpen(false)
  }

  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={enter}
      onMouseLeave={leave}
      onFocus={enter}
      onBlur={leave}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className={cn(
            'anim-menu pointer-events-none absolute z-50 w-max max-w-xs rounded-md border border-border bg-elevated px-2.5 py-1.5 text-left text-xs leading-relaxed text-foreground shadow-overlay',
            PLACEMENT_CLS[placement]
          )}
        >
          {content}
        </span>
      )}
    </span>
  )
}
