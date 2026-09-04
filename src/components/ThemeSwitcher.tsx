import { Check, Palette } from 'lucide-react'
import { useDropdown } from '../hooks/useDropdown'
import { THEMES } from '../lib/themes'
import { cn } from '../lib/utils'
import { useThemeStore } from '../stores/theme'
import { themeStr } from '../strings/theme'

/** 顶栏主题切换器：5 个预置主题，即时生效 + 持久化（store） */
export function ThemeSwitcher() {
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const { open, setOpen, rootRef } = useDropdown()

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
        <Palette className="h-3.5 w-3.5" />
        <span className="hidden md:inline">{themeStr.themes[theme]}</span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label={themeStr.switcher.label}
          className="anim-menu absolute right-0 top-9 z-50 w-44 rounded-lg border border-border bg-panel p-1 shadow-overlay"
        >
          {THEMES.map(({ id, label, swatch }) => {
            const active = theme === id
            return (
              <button
                key={id}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setTheme(id)
                  setOpen(false)
                }}
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
                <span className="flex overflow-hidden rounded-sm border border-border">
                  {swatch.map((c) => (
                    <span key={c} className="h-3.5 w-1.5" style={{ backgroundColor: c }} />
                  ))}
                </span>
                {label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
