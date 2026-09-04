import { cn } from '../../lib/utils'

/** 内联加载指示（按钮内 / 骨架旁） */
export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-3.5 w-3.5 animate-spin', className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="loading"
      role="status"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

/** 骨架块（UX #8：加载态一律骨架，不用空白） */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-elevated', className)} />
}
