import { Boxes, CircleCheck, Clock, Home, ScrollText, Server, Users } from 'lucide-react'
import type { ComponentType } from 'react'
import { Link, NavLink, Outlet } from 'react-router'
import { cn } from '../../lib/utils'
import { S } from '../../strings/common'
import { layoutStr } from '../../strings/layout'
import { EnvSwitcher } from '../EnvSwitcher'
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

/** 应用布局壳：顶栏（logo + 环境切换 + 用户）+ 侧栏导航 + 内容区 */
export function AppLayout() {
  return (
    <div className="flex h-screen flex-col bg-page text-foreground">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-panel px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
            A
          </span>
          <span className="text-sm font-semibold">{S.appName}</span>
        </Link>
        <div className="flex-1" />
        <EnvSwitcher />
        <div className="mx-1 h-4 w-px bg-border" />
        <UserMenu />
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-48 shrink-0 flex-col border-r border-border p-2 md:flex">
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
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors duration-150 ease-out',
                      isActive
                        ? 'bg-elevated font-medium text-foreground'
                        : 'text-muted-foreground hover:bg-elevated hover:text-foreground'
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

        <main className="min-w-0 flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
