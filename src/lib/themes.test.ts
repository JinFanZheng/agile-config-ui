import { describe, expect, it } from 'vitest'
import { themeStr } from '../strings/theme'
import {
  DEFAULT_THEME,
  isDarkTheme,
  isThemeId,
  isThemeSetting,
  resolveThemeSetting,
  SYSTEM_DARK_THEME,
  SYSTEM_LIGHT_THEME,
  THEMES,
  THEME_IDS,
} from './themes'

/** ITER-12：主题注册表完整性——新增主题必须四处同步（css 令牌块另有 contrast 脚本核对） */
describe('themes 注册表', () => {
  it('THEME_IDS 无重复', () => {
    expect(new Set(THEME_IDS).size).toBe(THEME_IDS.length)
  })

  it('THEMES 与 THEME_IDS 一一对应且顺序一致', () => {
    expect(THEMES.map((t) => t.id)).toEqual([...THEME_IDS])
  })

  it('每个主题色样为 3 个六位 hex（强调色/底色/边框色）', () => {
    for (const { id, swatch } of THEMES) {
      expect(swatch, id).toHaveLength(3)
      for (const c of swatch) expect(c, `${id} ${c}`).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('深浅分布：5 深 5 浅（深色=monaco 深色底的判定依据）', () => {
    expect(THEME_IDS.filter(isDarkTheme).sort()).toEqual(
      ['forest', 'mocha', 'navy-console', 'obsidian', 'violet-night']
    )
    expect(THEME_IDS.filter((id) => !isDarkTheme(id)).sort()).toEqual(
      ['clear-blue', 'fresh-mint', 'graphite', 'sakura', 'warm-paper']
    )
  })

  it('strings/theme.ts 展示名覆盖全部主题 id（无遗漏无多余）', () => {
    expect(Object.keys(themeStr.themes).sort()).toEqual([...THEME_IDS].sort())
  })

  it('DEFAULT_THEME 合法且为浅色（首屏默认不闪深）', () => {
    expect(isThemeId(DEFAULT_THEME)).toBe(true)
    expect(isDarkTheme(DEFAULT_THEME)).toBe(false)
  })

  it('isThemeId 拒绝非法值（system 是设置哨兵，不是具体主题）', () => {
    expect(isThemeId('dark')).toBe(false)
    expect(isThemeId('system')).toBe(false)
    expect(isThemeId('')).toBe(false)
    expect(isThemeId(null)).toBe(false)
  })

  it('跟随系统：isThemeSetting 接受 system 与具体主题，拒绝其他值', () => {
    expect(isThemeSetting('system')).toBe(true)
    expect(isThemeSetting('graphite')).toBe(true)
    expect(isThemeSetting('dark')).toBe(false)
    expect(isThemeSetting(null)).toBe(false)
  })

  it('resolveThemeSetting：system 按系统深浅映射（深=深蓝中控/浅=石墨），具体主题原样返回', () => {
    expect(resolveThemeSetting('system', true)).toBe(SYSTEM_DARK_THEME)
    expect(resolveThemeSetting('system', false)).toBe(SYSTEM_LIGHT_THEME)
    expect(resolveThemeSetting('sakura', true)).toBe('sakura')
    expect(resolveThemeSetting('navy-console', false)).toBe('navy-console')
  })

  it('resolveThemeSetting：支持用户自定义深浅映射（ITER-14）', () => {
    expect(resolveThemeSetting('system', true, 'obsidian', 'sakura')).toBe('obsidian')
    expect(resolveThemeSetting('system', false, 'obsidian', 'sakura')).toBe('sakura')
    expect(resolveThemeSetting('forest', true, 'obsidian', 'sakura')).toBe('forest')
  })
})
