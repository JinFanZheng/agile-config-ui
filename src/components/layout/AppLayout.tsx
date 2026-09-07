import { useQuery } from '@tanstack/react-query'
import {
  BookOpen,
  Boxes,
  CircleCheck,
  Clock,
  Home,
  Menu,
  ScrollText,
  Server,
  Settings,
  Shield,
  Users,
  Waypoints,
} from 'lucide-react'
import { useEffect, useState, type ComponentType } from 'react'
import { Link, NavLink, Outlet } from 'react-router'
import { getSys } from '../../api/ops'
import { cn } from '../../lib/utils'
import { S } from '../../strings/common'
import { layoutStr } from '../../strings/layout'
import { EnvSwitcher } from '../EnvSwitcher'
import { usePermission } from '../../hooks/usePermission'
import { PERMISSION } from '../../lib/permissions'
import { ThemeSwitcher } from '../ThemeSwitcher'
import { UserMenu } from '../UserMenu'

interface NavItem {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
  /** 页面级权限码（fail-closed：无权限不显示入口） */
  perm?: string
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: layoutStr.nav.overview, icon: Home },
  { to: '/apps', label: layoutStr.nav.apps, icon: Boxes, perm: PERMISSION.AppRead },
  { to: '/history', label: layoutStr.nav.publishHistory, icon: Clock, perm: PERMISSION.ConfigRead },
  { to: '/clients', label: layoutStr.nav.clients, icon: CircleCheck, perm: PERMISSION.ClientRead },
  { to: '/nodes', label: layoutStr.nav.nodes, icon: Server, perm: PERMISSION.NodeRead },
  { to: '/logs', label: layoutStr.nav.logs, icon: ScrollText, perm: PERMISSION.LogRead },
  { to: '/users', label: layoutStr.nav.users, icon: Users, perm: PERMISSION.UserRead },
  { to: '/roles', label: layoutStr.nav.roles, icon: Shield, perm: PERMISSION.RoleRead },
  { to: '/services', label: layoutStr.nav.services, icon: Waypoints, perm: PERMISSION.ServiceRead },
  { to: '/guide', label: layoutStr.nav.guide, icon: BookOpen },
  { to: '/settings', label: layoutStr.nav.settings, icon: Settings },
]

/**
 * 应用布局壳：顶栏（logo + 环境切换 + 主题 + 用户）+ 侧栏导航 + 全宽流式内容区。
 * 布局对齐设计稿基准（graphite/C 稿）：<md 侧栏转抽屉，内容区随视口全宽。
 */
export function AppLayout() {
  const [navOpen, setNavOpen] = useState(false)
  const { can } = usePermission()
  // 侧栏版本号由匿名接口 /Home/Sys 驱动；加载/失败/缺 appVer 时仅显示产品名
  const sys = useQuery({ queryKey: ['ops', 'sys'], queryFn: getSys, staleTime: 300_000 })

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
            {NAV_ITEMS.filter((item) => !item.perm || can(item.perm)).map(
              ({ to, label, icon: Icon }) => (
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
            {sys.data?.appVer ? `${S.appName} ${sys.data.appVer}` : S.appName}
          </p>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
