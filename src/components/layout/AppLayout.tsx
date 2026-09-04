import { Boxes, CircleCheck, Clock, Home, Menu, ScrollText, Server, Users } from 'lucide-react'
import { useEffect, useState, type ComponentType } from 'react'
import { Link, NavLink, Outlet } from 'react-router'
import { cn } from '../../lib/utils'
import { S } from '../../strings/common'
import { layoutStr } from '../../strings/layout'
import { EnvSwitcher } from '../EnvSwitcher'
import { ThemeSwitcher } from '../ThemeSwitcher'
import { UserMenu } from '../UserMenu'

interface NavItem {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
  /** 后续里程碑的入口：可见但禁用，保持信息架构稳定 */
  soon?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: layoutStr.nav.overview, icon: Home },
  { to: '/apps', label: layoutStr.nav.apps, icon: Boxes },
  { to: '/history', label: layoutStr.nav.publishHistory, icon: Clock, soon: true },
  { to: '/clients', label: layoutStr.nav.clients, icon: CircleCheck, soon: true },
  { to: '/nodes', label: layoutStr.nav.nodes, icon: Server, soon: true },
  { to: '/users', label: layoutStr.nav.users, icon: Users, soon: true },
  { to: '/logs', label: layoutStr.nav.logs, icon: ScrollText, soon: true },
]

/**
 * 应用布局壳：顶栏（logo + 环境切换 + 主题 + 用户）+ 侧栏导航 + 全宽流式内容区。
 * 布局对齐设计稿基准（graphite/C 稿）：<md 侧栏转抽屉，内容区随视口全宽。
 */
export function AppLayout() {
  const [navOpen, setNavOpen] = useState(false)

  useEffect(() => {
    if (!navOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNavOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [navOpen])

  return (
    <div className="flex h-screen flex-col bg-page text-foreground">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-header bg-panel px-3 md:gap-3 md:px-4">
        <button
          type="button"
          aria-label={layoutStr.nav.openMenu}
          aria-expanded={navOpen}
          onClick={() => setNavOpen(true)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-hover hover:text-foreground md:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
            A
          </span>
          <span className="text-sm font-semibold">{S.appName}</span>
        </Link>
        <div className="flex-1" />
        <EnvSwitcher />
        <div className="mx-1 hidden h-4 w-px bg-border sm:block" />
        <ThemeSwitcher />
        <UserMenu />
      </header>

      <div className="flex min-h-0 flex-1">
        {/* 小屏抽屉遮罩 */}
        {navOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setNavOpen(false)
            }}
          />
        )}
        <aside
          className={
            navOpen
              ? 'anim-drawer fixed top-12 bottom-0 left-0 z-50 flex w-48 flex-col border-r border-border bg-panel p-2'
              : 'hidden w-48 shrink-0 flex-col border-r border-border bg-panel p-2 md:flex'
          }
        >
          <nav className="flex flex-col gap-0.5">
            {NAV_ITEMS.map(({ to, label, icon: Icon, soon }) =>
              soon ? (
                <span
                  key={to}
                  title={S.comingSoon}
                  className="flex cursor-default items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground/50 select-none"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </span>
              ) : (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  onClick={() => setNavOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors duration-150 ease-out',
                      isActive
                        ? 'bg-selected font-medium text-selected-foreground'
                        : 'text-muted-foreground hover:bg-hover hover:text-foreground'
                    )
                  }
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </NavLink>
              )
            )}
          </nav>
          <div className="flex-1" />
          <p className="px-2.5 pb-1 font-mono text-[10px] text-muted-foreground/50">
            AgileConfig 1.13.2
          </p>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
