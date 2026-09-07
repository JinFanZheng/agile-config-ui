/** 主题注册表 —— 主题清单与默认值的事实源（令牌值在 src/index.css） */
export const THEME_IDS = [
  'graphite',
  'clear-blue',
  'warm-paper',
  'navy-console',
  'fresh-mint',
  'obsidian',
  'violet-night',
  'sakura',
  'mocha',
  'forest',
] as const

export type ThemeId = (typeof THEME_IDS)[number]

export const DEFAULT_THEME: ThemeId = 'graphite'

export function isThemeId(v: unknown): v is ThemeId {
  return typeof v === 'string' && (THEME_IDS as readonly string[]).includes(v)
}

// ---------------------------------------------------------------------------
// 跟随系统档（ITER-13/14）：'system' 不是具体主题，是设置值哨兵；
// 解析为具体主题后才有令牌/monaco/防闪屏语义。深浅映射默认深→深蓝中控、浅→石墨，
// 用户可在设置页自定义（store 的 systemDark/systemLight）。
// ---------------------------------------------------------------------------
export const SYSTEM_THEME = 'system' as const

export type ThemeSetting = ThemeId | typeof SYSTEM_THEME

export const SYSTEM_DARK_THEME: ThemeId = 'navy-console'
export const SYSTEM_LIGHT_THEME: ThemeId = 'graphite'

export function isThemeSetting(v: unknown): v is ThemeSetting {
  return v === SYSTEM_THEME || isThemeId(v)
}

/** 解析纯函数：system 按用户映射（缺省=默认映射）解析，具体主题原样返回（boot 脚本/store 共用同一规则） */
export function resolveThemeSetting(
  theme: ThemeSetting,
  prefersDark: boolean,
  systemDark: ThemeId = SYSTEM_DARK_THEME,
  systemLight: ThemeId = SYSTEM_LIGHT_THEME
): ThemeId {
  if (theme !== SYSTEM_THEME) return theme
  return prefersDark ? systemDark : systemLight
}

/** 深色主题集合（color-scheme: dark）——monaco 等第三方深浅判定以此为准，勿硬编码单个主题 id */
const DARK_THEMES: ReadonlySet<ThemeId> = new Set(['navy-console', 'obsidian', 'violet-night', 'mocha', 'forest'])

export function isDarkTheme(theme: ThemeId): boolean {
  return DARK_THEMES.has(theme)
}

export interface ThemeMeta {
  id: ThemeId
  /** 展示名（strings/theme.ts 的 key） */
  label: string
  /** 切换器菜单里的三色样条（强调色 / 底色 / 边框色） */
  swatch: [string, string, string]
}

export const THEMES: ThemeMeta[] = [
  { id: 'graphite', label: '石墨', swatch: ['#18181b', '#ffffff', '#e4e4e7'] },
  { id: 'clear-blue', label: '晨雾蓝', swatch: ['#2456d6', '#f7f9fc', '#e5eaf2'] },
  { id: 'warm-paper', label: '暖纸', swatch: ['#2b2620', '#f6f4ef', '#e7e0d2'] },
  { id: 'navy-console', label: '深蓝中控', swatch: ['#38bdf8', '#0a1424', '#1d365c'] },
  { id: 'fresh-mint', label: '薄荷', swatch: ['#0f766e', '#f5faf8', '#d9eae4'] },
  { id: 'obsidian', label: '曜石', swatch: ['#fafafa', '#000000', '#1f1f26'] },
  { id: 'violet-night', label: '紫夜', swatch: ['#a78bfa', '#120f1e', '#2e2650'] },
  { id: 'sakura', label: '樱粉', swatch: ['#b52a86', '#fdf7f9', '#f0dfe7'] },
  { id: 'mocha', label: '摩卡', swatch: ['#ead9ae', '#16120b', '#362d1d'] },
  { id: 'forest', label: '森夜', swatch: ['#d5e8da', '#0c1410', '#1f3529'] },
]
