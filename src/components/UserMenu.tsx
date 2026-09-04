import { KeyRound, LogOut } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { logout } from '../api/auth'
import { useAuthStore } from '../stores/auth'
import { S } from '../strings/common'
import { layoutStr } from '../strings/layout'
import { cn } from '../lib/utils'

/** 顶栏用户菜单：显示当前用户，提供登出（修改密码 M5 提供） */
export function UserMenu() {
  const user = useAuthStore((s) => s.user)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    // Esc 关闭（UX #10）
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!user) return null

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-7 items-center gap-2 rounded-md px-1.5 transition-colors duration-150 hover:bg-elevated"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
          {user.userName.slice(0, 1).toUpperCase()}
        </span>
        <span className="text-xs text-foreground">{user.userName}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-9 z-50 w-52 rounded-lg border border-border bg-elevated p-1 shadow-lg shadow-black/30"
        >
          <div className="border-b border-border px-2.5 py-2">
            <p className="font-mono text-xs text-foreground">{user.userName}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {user.roles.length > 0 ? user.roles.join(', ') : '—'}
            </p>
          </div>
          <button
            type="button"
            role="menuitem"
            disabled
            title={S.comingSoon}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground opacity-60"
          >
            <KeyRound className="h-3.5 w-3.5" />
            {layoutStr.userMenu.changePassword}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => logout()}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-foreground',
              'transition-colors duration-150 hover:bg-panel'
            )}
          >
            <LogOut className="h-3.5 w-3.5" />
            {S.logout}
          </button>
        </div>
      )}
    </div>
  )
}
