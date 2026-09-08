import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_EDITOR_FONT_SIZE,
  EDITOR_FONT_SIZES,
  SETTINGS_STORAGE_KEY,
  LEGACY_THEME_STORAGE_KEY,
  planLegacyThemeMigration,
  migrateLegacyTheme,
  useSettingsStore,
} from './settings'
import { DEFAULT_THEME } from '../lib/themes'

function persisted(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    state: {
      theme: DEFAULT_THEME,
      uiFontSize: 'standard',
      editorFontSize: DEFAULT_EDITOR_FONT_SIZE,
      motion: true,
      ...overrides,
    },
    version: 0,
  })
}

describe('planLegacyThemeMigration（迁移决策纯函数）', () => {
  it('老键合法主题 → 迁移该主题', () => {
    expect(
      planLegacyThemeMigration(null, JSON.stringify({ state: { theme: 'navy-console' }, version: 0 }))
    ).toBe('navy-console')
  })

  it('新键已存在 → 不迁移（幂等）', () => {
    expect(
      planLegacyThemeMigration(persisted(), JSON.stringify({ state: { theme: 'navy-console' }, version: 0 }))
    ).toBeNull()
  })

  it('老键缺失 → 不迁移', () => {
    expect(planLegacyThemeMigration(null, null)).toBeNull()
  })

  it('老键主题非法 → 回退默认（null，不迁移）', () => {
    expect(planLegacyThemeMigration(null, JSON.stringify({ state: { theme: 'hacker-green' }, version: 0 }))).toBeNull()
  })

  it('老键 JSON 损坏 → 回退默认（null，不迁移）', () => {
    expect(planLegacyThemeMigration(null, '{oops')).toBeNull()
  })
})

describe('migrateLegacyTheme（迁移副作用）', () => {
  beforeEach(() => localStorage.clear())

  it('写入新键并删除老键', () => {
    localStorage.setItem(LEGACY_THEME_STORAGE_KEY, JSON.stringify({ state: { theme: 'fresh-mint' }, version: 0 }))
    expect(migrateLegacyTheme()).toBe(true)
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    expect(JSON.parse(raw!).state.theme).toBe('fresh-mint')
    expect(localStorage.getItem(LEGACY_THEME_STORAGE_KEY)).toBeNull()
  })

  it('无老键时不写新键', () => {
    expect(migrateLegacyTheme()).toBe(false)
    expect(localStorage.getItem(SETTINGS_STORAGE_KEY)).toBeNull()
  })
})

describe('useSettingsStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useSettingsStore.getState().setTheme(DEFAULT_THEME)
    useSettingsStore.getState().setUiFontSize('standard')
    useSettingsStore.getState().setEditorFontSize(DEFAULT_EDITOR_FONT_SIZE)
    useSettingsStore.getState().setMotion(true)
  })

  it('默认值：graphite / 标准 / 12 / 动效开', () => {
    const s = useSettingsStore.getState()
    expect(s.theme).toBe('graphite')
    expect(s.uiFontSize).toBe('standard')
    expect(s.editorFontSize).toBe(DEFAULT_EDITOR_FONT_SIZE)
    expect(s.motion).toBe(true)
  })

  it('setTheme 更新状态、写入 data-theme 并持久化到统一键', () => {
    useSettingsStore.getState().setTheme('navy-console')
    expect(useSettingsStore.getState().theme).toBe('navy-console')
    expect(document.documentElement.dataset.theme).toBe('navy-console')
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    expect(JSON.parse(raw!).state.theme).toBe('navy-console')
  })

  it('setUiFontSize / setMotion 同步 html dataset', () => {
    useSettingsStore.getState().setUiFontSize('compact')
    useSettingsStore.getState().setMotion(false)
    expect(document.documentElement.dataset.uiFont).toBe('compact')
    expect(document.documentElement.dataset.motion).toBe('off')
  })

  it('setEditorFontSize 只改状态（无 document 副作用）并持久化', () => {
    useSettingsStore.getState().setEditorFontSize(15)
    expect(useSettingsStore.getState().editorFontSize).toBe(15)
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    expect(JSON.parse(raw!).state.editorFontSize).toBe(15)
  })

  it('持久化恢复时把全部设置应用到 document（merge 钩子）', () => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      persisted({ theme: 'clear-blue', uiFontSize: 'large', motion: false, editorFontSize: 14 })
    )
    useSettingsStore.persist.rehydrate()
    const s = useSettingsStore.getState()
    expect(s.theme).toBe('clear-blue')
    expect(s.uiFontSize).toBe('large')
    expect(s.editorFontSize).toBe(14)
    expect(s.motion).toBe(false)
    expect(document.documentElement.dataset.theme).toBe('clear-blue')
    expect(document.documentElement.dataset.uiFont).toBe('large')
    expect(document.documentElement.dataset.motion).toBe('off')
  })

  it('非法持久化值逐字段回退默认', () => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      persisted({ theme: 'hacker-green', uiFontSize: 'huge', editorFontSize: 99, motion: 'yes' })
    )
    useSettingsStore.persist.rehydrate()
    const s = useSettingsStore.getState()
    expect(s.theme).toBe('graphite')
    expect(s.uiFontSize).toBe('standard')
    expect(s.editorFontSize).toBe(DEFAULT_EDITOR_FONT_SIZE)
    expect(typeof s.motion).toBe('boolean')
  })

  it('模块加载即迁移：老键在 store 创建前被收敛进新键', async () => {
    vi.resetModules()
    localStorage.clear()
    localStorage.setItem(LEGACY_THEME_STORAGE_KEY, JSON.stringify({ state: { theme: 'warm-paper' }, version: 0 }))
    const mod = await import('./settings')
    expect(mod.useSettingsStore.getState().theme).toBe('warm-paper')
    expect(JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY)!).state.theme).toBe('warm-paper')
    expect(localStorage.getItem(LEGACY_THEME_STORAGE_KEY)).toBeNull()
  })

  it('动效默认跟随系统 prefers-reduced-motion', async () => {
    vi.resetModules()
    localStorage.clear()
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }))
    const mod = await import('./settings')
    expect(mod.useSettingsStore.getState().motion).toBe(false)
    vi.unstubAllGlobals()
  })

  it('编辑器字号档位枚举为 12/13/14/15', () => {
    expect([...EDITOR_FONT_SIZES]).toEqual([12, 13, 14, 15])
  })

  it('落地页/分页大小/侧栏折叠：setter 生效并持久化；非法持久化值回退默认（ITER-24）', () => {
    useSettingsStore.getState().setDefaultLandingPage('apps')
    useSettingsStore.getState().setDefaultPageSize(100)
    useSettingsStore.getState().setSidebarCollapsed(true)
    const st = useSettingsStore.getState()
    expect(st.defaultLandingPage).toBe('apps')
    expect(st.defaultPageSize).toBe(100)
    expect(st.sidebarCollapsed).toBe(true)
    const raw = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY)!)
    expect(raw.state.defaultLandingPage).toBe('apps')

    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      persisted({ defaultLandingPage: 'home', defaultPageSize: 33, sidebarCollapsed: 'yes' })
    )
    useSettingsStore.persist.rehydrate()
    const st2 = useSettingsStore.getState()
    expect(st2.defaultLandingPage).toBe('overview')
    expect(st2.defaultPageSize).toBe(20)
    expect(st2.sidebarCollapsed).toBe(false)
  })

  it('配置页默认视图与自动换行：setter 生效并持久化；非法持久化值回退默认', () => {
    useSettingsStore.getState().setDefaultConfigView('json')
    useSettingsStore.getState().setEditorWordWrap(true)
    expect(useSettingsStore.getState().defaultConfigView).toBe('json')
    expect(useSettingsStore.getState().editorWordWrap).toBe(true)
    const raw = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY)!)
    expect(raw.state.defaultConfigView).toBe('json')
    expect(raw.state.editorWordWrap).toBe(true)

    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      persisted({ defaultConfigView: 'history', editorWordWrap: 'yes' })
    )
    useSettingsStore.persist.rehydrate()
    expect(useSettingsStore.getState().defaultConfigView).toBe('table')
    expect(useSettingsStore.getState().editorWordWrap).toBe(false)
  })

  it('setTheme(system)：resolvedTheme 按系统配色解析并写 data-theme（深→深蓝中控 / 浅→石墨）', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }))
    useSettingsStore.getState().setTheme('system')
    expect(useSettingsStore.getState().theme).toBe('system')
    expect(useSettingsStore.getState().resolvedTheme).toBe('navy-console')
    expect(document.documentElement.dataset.theme).toBe('navy-console')

    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }))
    useSettingsStore.getState().setTheme('system')
    expect(useSettingsStore.getState().resolvedTheme).toBe('graphite')
    expect(document.documentElement.dataset.theme).toBe('graphite')
    vi.unstubAllGlobals()
  })

  it('持久化恢复 system 档：resolvedTheme 重新解析并应用', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, persisted({ theme: 'system' }))
    useSettingsStore.persist.rehydrate()
    const s = useSettingsStore.getState()
    expect(s.theme).toBe('system')
    expect(['navy-console', 'graphite']).toContain(s.resolvedTheme)
    expect(['navy-console', 'graphite']).toContain(document.documentElement.dataset.theme)
  })

  it('system 档深浅映射可配置：修改映射即时重解析并持久化；非法持久化值回退默认映射', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true })) // 系统深色
    useSettingsStore.getState().setTheme('system')
    expect(useSettingsStore.getState().resolvedTheme).toBe('navy-console') // 默认映射

    useSettingsStore.getState().setSystemDark('obsidian')
    expect(useSettingsStore.getState().resolvedTheme).toBe('obsidian')
    expect(document.documentElement.dataset.theme).toBe('obsidian')
    const raw = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY)!)
    expect(raw.state.systemDark).toBe('obsidian')
    expect(raw.state.systemLight).toBe('graphite')

    // 非 system 档改映射：只持久化，不动当前主题
    useSettingsStore.getState().setTheme('sakura')
    useSettingsStore.getState().setSystemLight('clear-blue')
    expect(useSettingsStore.getState().resolvedTheme).toBe('sakura')
    expect(document.documentElement.dataset.theme).toBe('sakura')

    // 非法持久化映射 → 回退默认（深=深蓝中控/浅=石墨）
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      persisted({ theme: 'system', systemDark: 'hacker-green', systemLight: null })
    )
    useSettingsStore.persist.rehydrate()
    const s2 = useSettingsStore.getState()
    expect(s2.systemDark).toBe('navy-console')
    expect(s2.systemLight).toBe('graphite')
    vi.unstubAllGlobals()
  })

  it('系统配色变化时 system 档实时跟随（不刷新页面）', async () => {
    vi.resetModules()
    localStorage.clear()
    const listeners: Array<() => void> = []
    let dark = false
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((q: string) => ({
        matches: q.includes('prefers-color-scheme: dark') ? dark : false,
        addEventListener: (_t: string, fn: () => void) => listeners.push(fn),
        removeEventListener: () => {},
      }))
    )
    const mod = await import('./settings')
    mod.useSettingsStore.getState().setTheme('system')
    expect(mod.useSettingsStore.getState().resolvedTheme).toBe('graphite')

    dark = true
    for (const fn of listeners) fn()
    expect(mod.useSettingsStore.getState().resolvedTheme).toBe('navy-console')
    expect(document.documentElement.dataset.theme).toBe('navy-console')
    vi.unstubAllGlobals()
  })
})
