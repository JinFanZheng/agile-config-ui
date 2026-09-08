import { useQuery } from '@tanstack/react-query'
import {
  BookOpen,
  ChevronsLeft,
  ChevronsRight,
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
import { useSettingsStore } from '../../stores/settings'
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

interface NavGroup {
  /** 组标签；无标签 = 不分组的置顶/沉底段 */
  label?: string
  items: NavItem[]
}

/** 侧栏导航分组（ITER-16）：概览置顶、接入指南/设置沉底不分组；权限过滤后组内无可见项则整组隐藏 */
const NAV_GROUPS: NavGroup[] = [
  { items: [{ to: '/', label: layoutStr.nav.overview, icon: Home }] },
  {
    label: layoutStr.navGroups.config,
    items: [
      { to: '/apps', label: layoutStr.nav.apps, icon: Boxes, perm: PERMISSION.AppRead },
      { to: '/history', label: layoutStr.nav.publishHistory, icon: Clock, perm: PERMISSION.ConfigRead },
    ],
  },
  {
    label: layoutStr.navGroups.ops,
    items: [
      { to: '/clients', label: layoutStr.nav.clients, icon: CircleCheck, perm: PERMISSION.ClientRead },
      { to: '/nodes', label: layoutStr.nav.nodes, icon: Server, perm: PERMISSION.NodeRead },
      { to: '/services', label: layoutStr.nav.services, icon: Waypoints, perm: PERMISSION.ServiceRead },
      { to: '/logs', label: layoutStr.nav.logs, icon: ScrollText, perm: PERMISSION.LogRead },
    ],
  },
  {
    label: layoutStr.navGroups.access,
    items: [
      { to: '/users', label: layoutStr.nav.users, icon: Users, perm: PERMISSION.UserRead },
      { to: '/roles', label: layoutStr.nav.roles, icon: Shield, perm: PERMISSION.RoleRead },
    ],
  },
  {
    items: [
      { to: '/guide', label: layoutStr.nav.guide, icon: BookOpen },
      { to: '/settings', label: layoutStr.nav.settings, icon: Settings },
    ],
  },
]

/**
 * 应用布局壳：顶栏（logo + 环境切换 + 主题 + 用户）+ 侧栏导航 + 全宽流式内容区。
 * 布局对齐设计稿基准（graphite/C 稿）：<md 侧栏转抽屉，内容区随视口全宽。
 */
export function AppLayout() {
  const [navOpen, setNavOpen] = useState(false)
  const sidebarCollapsed = useSettingsStore((s) => s.sidebarCollapsed)
  const setSidebarCollapsed = useSettingsStore((s) => s.setSidebarCollapsed)
  // 折叠只作用于桌面停靠态；移动端抽屉（navOpen）恒为完整宽度
  const collapsed = sidebarCollapsed && !navOpen
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
          <span className="hidden text-sm font-semibold sm:inline">{S.appName}</span>
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
              : cn(
                  'hidden shrink-0 flex-col border-r border-border bg-panel p-2 md:flex',
                  collapsed ? 'w-14' : 'w-48'
                )
          }
        >
          <nav className="flex flex-col gap-0.5">
            {NAV_GROUPS.map((group, gi) => {
              const visible = group.items.filter((item) => !item.perm || can(item.perm))
              if (visible.length === 0) return null
              return (
                <div key={group.label ?? `nav-section-${gi}`} className="pt-2 first:pt-0">
                  {group.label && !collapsed && (
                    <p className="px-2.5 pb-1 text-[10px] text-muted-foreground/60">{group.label}</p>
                  )}
                  {visible.map(({ to, label, icon: Icon }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={to === '/'}
                      title={label}
                      onClick={() => setNavOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center rounded-md py-1.5 text-xs transition-colors duration-150 ease-out',
                          collapsed ? 'justify-center px-1.5' : 'gap-2 px-2.5',
                          isActive
                            ? 'bg-selected font-medium text-selected-foreground'
                            : 'text-muted-foreground hover:bg-hover hover:text-foreground'
                        )
                      }
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className={collapsed ? 'sr-only' : undefined}>{label}</span>
                    </NavLink>
                  ))}
                </div>
              )
            })}
          </nav>
          <div className="flex-1" />
          {/* 折叠开关：仅桌面停靠态可见（移动端抽屉恒为完整宽度） */}
          {!navOpen && (
            <button
              type="button"
              aria-label={collapsed ? layoutStr.nav.expandSidebar : layoutStr.nav.collapseSidebar}
              title={collapsed ? layoutStr.nav.expandSidebar : layoutStr.nav.collapseSidebar}
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={cn(
                'flex items-center rounded-md py-1.5 text-muted-foreground transition-colors duration-150 ease-out hover:bg-hover hover:text-foreground',
                collapsed ? 'justify-center px-1.5' : 'px-2.5'
              )}
            >
              {collapsed ? (
                <ChevronsRight className="h-3.5 w-3.5" />
              ) : (
                <ChevronsLeft className="h-3.5 w-3.5" />
              )}
              <span className={collapsed ? 'sr-only' : undefined}>
                {collapsed ? layoutStr.nav.expandSidebar : layoutStr.nav.collapseSidebar}
              </span>
            </button>
          )}
          {!collapsed && (
            <p className="px-2.5 pb-1 pt-1 font-mono text-[10px] text-muted-foreground/50">
              {sys.data?.appVer ? `${S.appName} ${sys.data.appVer}` : S.appName}
            </p>
          )}
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
