import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_THEME, isThemeId, type ThemeId } from '../lib/themes'

function applyToDocument(theme: ThemeId) {
  document.documentElement.dataset.theme = theme
}

interface ThemeState {
  theme: ThemeId
  setTheme: (theme: ThemeId) => void
}

/** 当前主题（localStorage 持久化；防闪屏由 index.html 的 boot 脚本先行应用） */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: DEFAULT_THEME,
      setTheme: (theme) => {
        applyToDocument(theme)
        set({ theme })
      },
    }),
    {
      name: 'agile-config-ui.theme',
      merge: (persisted, current) => {
        const p = persisted as Partial<ThemeState> | undefined
        const theme = isThemeId(p?.theme) ? p.theme : DEFAULT_THEME
        applyToDocument(theme)
        return { ...current, theme }
      },
    }
  )
)
