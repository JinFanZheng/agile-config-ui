import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  DEFAULT_THEME,
  isThemeId,
  isThemeSetting,
  resolveThemeSetting,
  SYSTEM_DARK_THEME,
  SYSTEM_LIGHT_THEME,
  SYSTEM_THEME,
  type ThemeId,
  type ThemeSetting,
} from '../lib/themes'

/**
 * 设置中心 store（ITER-09）：浏览器本地个性化设置，统一持久化键。
 * 防闪屏由 index.html 引导脚本先行铺 data-theme / data-ui-font / data-motion 与 html 背景。
 */

/** 统一设置持久化键（index.html 引导脚本读同一个键；结构为 zustand persist 的 {state,version}） */
export const SETTINGS_STORAGE_KEY = 'agile-config-ui.settings'
/** 老版本主题键（ITER-02~08），仅作迁移来源，迁完即删 */
export const LEGACY_THEME_STORAGE_KEY = 'agile-config-ui.theme'

// ---------------------------------------------------------------------------
// 界面字号档位（html[data-ui-font]，缩放比在 src/index.css 的 --font-ui-scale）
// ---------------------------------------------------------------------------
export const UI_FONT_SIZES = ['compact', 'standard', 'large'] as const
export type UiFontSize = (typeof UI_FONT_SIZES)[number]
export const DEFAULT_UI_FONT_SIZE: UiFontSize = 'standard'

export function isUiFontSize(v: unknown): v is UiFontSize {
  return typeof v === 'string' && (UI_FONT_SIZES as readonly string[]).includes(v)
}

// ---------------------------------------------------------------------------
// 编辑器字号（monaco Editor/DiffEditor options.fontSize；KV 文本视图同源）
// ---------------------------------------------------------------------------
export const EDITOR_FONT_SIZES = [12, 13, 14, 15] as const
export type EditorFontSize = (typeof EDITOR_FONT_SIZES)[number]
/** 默认 12：与设置中心落地前的编辑器现状一致，老用户无感 */
export const DEFAULT_EDITOR_FONT_SIZE: EditorFontSize = 12

export function isEditorFontSize(v: unknown): v is EditorFontSize {
  return typeof v === 'number' && (EDITOR_FONT_SIZES as readonly number[]).includes(v)
}

/** 动效默认跟随系统"减少动态"偏好（用户一旦显式设置则以持久化值为准） */
function systemPrefersReducedMotion(): boolean {
  try {
    return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/** 系统配色偏好（跟随系统主题档的解析依据） */
function systemPrefersDark(): boolean {
  try {
    return !!window.matchMedia?.('(prefers-color-scheme: dark)').matches
  } catch {
    return false
  }
}

/** 把设置写到 <html>：dataset 供 CSS 令牌/动效选择器消费。返回解析后的有效主题（system → 具体 id） */
function applyToDocument(
  s: Pick<SettingsState, 'theme' | 'uiFontSize' | 'motion' | 'systemDark' | 'systemLight'>
): ThemeId {
  const doc = document.documentElement
  const resolved = resolveThemeSetting(s.theme, systemPrefersDark(), s.systemDark, s.systemLight)
  doc.dataset.theme = resolved
  doc.dataset.uiFont = s.uiFontSize
  doc.dataset.motion = s.motion ? 'on' : 'off'
  // html 内联背景：CSS 加载前由 index.html 引导脚本的静态映射铺底（防闪屏）；
  // 此处以 --bg-page 令牌实时值回写（令牌改色后自动跟随），取不到令牌则保留引导值。
  const bg = getComputedStyle(doc).getPropertyValue('--bg-page').trim()
  if (bg) doc.style.backgroundColor = bg
  return resolved
}

export interface SettingsState {
  /** 主题设置值：具体主题 id 或 'system'（跟随系统，ITER-13） */
  theme: ThemeSetting
  /** 有效主题（system 已解析为具体 id）：monaco 深浅、切换器文案等消费方一律用它 */
  resolvedTheme: ThemeId
  /** 跟随系统档的深/浅映射（用户可配置，默认 深蓝中控/石墨；选项限定各自深浅组） */
  systemDark: ThemeId
  systemLight: ThemeId
  uiFontSize: UiFontSize
  editorFontSize: EditorFontSize
  motion: boolean
  setTheme: (theme: ThemeSetting) => void
  setSystemDark: (theme: ThemeId) => void
  setSystemLight: (theme: ThemeId) => void
  setUiFontSize: (size: UiFontSize) => void
  setEditorFontSize: (size: EditorFontSize) => void
  setMotion: (on: boolean) => void
}

// ---------------------------------------------------------------------------
// 老键迁移（纯函数决策 + 副作用执行，单测见 settings.test.ts）
// ---------------------------------------------------------------------------

/**
 * 迁移决策（纯函数）：
 * - 新键已存在（无论内容）→ null：不做迁移，幂等，绝不覆盖新数据
 * - 老键存在且主题合法 → 返回该主题（老键 → 新键）
 * - 老键缺失 / JSON 损坏 / 主题非法 → null（回退默认主题，等效"非法值回退默认"）
 */
export function planLegacyThemeMigration(
  settingsRaw: string | null,
  legacyRaw: string | null
): ThemeId | null {
  if (settingsRaw) return null
  if (!legacyRaw) return null
  try {
    const theme = JSON.parse(legacyRaw)?.state?.theme
    return isThemeId(theme) ? theme : null
  } catch {
    return null
  }
}

/** 执行老键迁移（fail-safe：任何异常吞掉、保留现场、不影响启动） */
export function migrateLegacyTheme(): boolean {
  try {
    const theme = planLegacyThemeMigration(
      localStorage.getItem(SETTINGS_STORAGE_KEY),
      localStorage.getItem(LEGACY_THEME_STORAGE_KEY)
    )
    if (!theme) return false
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ state: { theme }, version: 0 })
    )
    localStorage.removeItem(LEGACY_THEME_STORAGE_KEY)
    return true
  } catch {
    return false
  }
}

// 应用启动即迁移：必须先于下方 create()（persist 创建时同步读取新键）
migrateLegacyTheme()

/** 设置中心（localStorage 持久化，1.13.2 无服务端偏好 API，不落服务端） */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: DEFAULT_THEME,
      resolvedTheme: DEFAULT_THEME,
      systemDark: SYSTEM_DARK_THEME,
      systemLight: SYSTEM_LIGHT_THEME,
      uiFontSize: DEFAULT_UI_FONT_SIZE,
      editorFontSize: DEFAULT_EDITOR_FONT_SIZE,
      motion: !systemPrefersReducedMotion(),
      setTheme: (theme) =>
        set((s) => {
          const resolvedTheme = applyToDocument({ ...s, theme })
          return { theme, resolvedTheme }
        }),
      // 映射变更即时生效（system 档下）并持久化；非 system 档仅持久化，等切回时生效
      setSystemDark: (systemDark) =>
        set((s) => ({ systemDark, resolvedTheme: applyToDocument({ ...s, systemDark }) })),
      setSystemLight: (systemLight) =>
        set((s) => ({ systemLight, resolvedTheme: applyToDocument({ ...s, systemLight }) })),
      setUiFontSize: (uiFontSize) =>
        set((s) => {
          applyToDocument({ ...s, uiFontSize })
          return { uiFontSize }
        }),
      setEditorFontSize: (editorFontSize) => set({ editorFontSize }),
      setMotion: (motion) =>
        set((s) => {
          applyToDocument({ ...s, motion })
          return { motion }
        }),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      merge: (persisted, current) => {
        const p = persisted as Partial<SettingsState> | undefined
        const next = {
          theme: isThemeSetting(p?.theme) ? p.theme : DEFAULT_THEME,
          systemDark: isThemeId(p?.systemDark) ? p.systemDark : SYSTEM_DARK_THEME,
          systemLight: isThemeId(p?.systemLight) ? p.systemLight : SYSTEM_LIGHT_THEME,
          uiFontSize: isUiFontSize(p?.uiFontSize) ? p.uiFontSize : DEFAULT_UI_FONT_SIZE,
          editorFontSize: isEditorFontSize(p?.editorFontSize)
            ? p.editorFontSize
            : DEFAULT_EDITOR_FONT_SIZE,
          motion: typeof p?.motion === 'boolean' ? p.motion : !systemPrefersReducedMotion(),
        }
        const resolvedTheme = applyToDocument(next)
        return { ...current, ...next, resolvedTheme }
      },
    }
  )
)

// ---------------------------------------------------------------------------
// 跟随系统（ITER-13）：system 档下系统配色切换时实时重解析并应用（不刷新页面）
// ---------------------------------------------------------------------------
try {
  const colorScheme = window.matchMedia('(prefers-color-scheme: dark)')
  const onSchemeChange = () => {
    const s = useSettingsStore.getState()
    if (s.theme !== SYSTEM_THEME) return
    const resolvedTheme = applyToDocument(s)
    useSettingsStore.setState({ resolvedTheme })
  }
  colorScheme.addEventListener?.('change', onSchemeChange)
} catch {
  // matchMedia 不可用（极端环境）：跟随系统退化为解析时点的静态值
}
