import { Check, Monitor, Palette } from 'lucide-react'
import { useDropdown } from '../hooks/useDropdown'
import { isDarkTheme, SYSTEM_THEME, THEMES, type ThemeMeta } from '../lib/themes'
import { cn } from '../lib/utils'
import { useSettingsStore } from '../stores/settings'
import { themeStr } from '../strings/theme'

/** 菜单项（menuitemradio + 三色样条；system 档用显示器图标） */
function ThemeItem({
  active,
  label,
  swatch,
  icon,
  onSelect,
}: {
  active: boolean
  label: string
  swatch?: [string, string, string]
  icon?: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={active}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-xs transition-colors duration-150 ease-out',
        active
          ? 'bg-selected font-medium text-selected-foreground'
          : 'text-muted-foreground hover:bg-hover hover:text-foreground'
      )}
    >
      <span className="flex h-3.5 w-3.5 items-center justify-center">
        {active && <Check className="h-3.5 w-3.5 text-foreground" />}
      </span>
      {icon ? (
        <Monitor className="h-3.5 w-3.5 shrink-0" />
      ) : (
        <span className="flex overflow-hidden rounded-sm border border-border">
          {swatch!.map((c) => (
            <span key={c} className="h-3.5 w-1.5" style={{ backgroundColor: c }} />
          ))}
        </span>
      )}
      {label}
    </button>
  )
}

/**
 * 顶栏主题切换器：跟随系统 + 浅色/深色两组（清单由 lib/themes.ts 注册表驱动），
 * 即时生效 + 持久化（与 /settings 主题设置同一 store，双向同步）。
 */
export function ThemeSwitcher() {
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const { open, setOpen, rootRef } = useDropdown()

  const light = THEMES.filter((t) => !isDarkTheme(t.id))
  const dark = THEMES.filter((t) => isDarkTheme(t.id))

  const renderGroup = (label: string, items: ThemeMeta[]) => (
    <div role="group" aria-label={label}>
      <p className="px-2 pt-1.5 pb-1 text-[10px] text-muted-foreground/60">{label}</p>
      {items.map(({ id, label: name, swatch }) => (
        <ThemeItem
          key={id}
          active={theme === id}
          label={name}
          swatch={swatch}
          onSelect={() => {
            setTheme(id)
            setOpen(false)
          }}
        />
      ))}
    </div>
  )

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        title={themeStr.switcher.title}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground transition-colors duration-150 ease-out hover:bg-hover hover:text-foreground"
      >
        {theme === SYSTEM_THEME ? <Monitor className="h-3.5 w-3.5" /> : <Palette className="h-3.5 w-3.5" />}
        <span className="hidden md:inline">
          {theme === SYSTEM_THEME ? themeStr.system : themeStr.themes[theme]}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label={themeStr.switcher.label}
          className="anim-menu absolute right-0 top-9 z-50 max-h-[min(26rem,calc(100vh-6rem))] w-44 overflow-y-auto rounded-lg border border-border bg-panel p-1 shadow-overlay"
        >
          <ThemeItem
            active={theme === SYSTEM_THEME}
            label={themeStr.system}
            icon
            onSelect={() => {
              setTheme(SYSTEM_THEME)
              setOpen(false)
            }}
          />
          {renderGroup(themeStr.groups.light, light)}
          {renderGroup(themeStr.groups.dark, dark)}
        </div>
      )}
    </div>
  )
}
