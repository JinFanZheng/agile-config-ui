import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_THEME } from '../lib/themes'
import { useThemeStore } from './theme'

describe('useThemeStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useThemeStore.getState().setTheme(DEFAULT_THEME)
  })

  it('默认主题为 graphite', () => {
    expect(useThemeStore.getState().theme).toBe('graphite')
  })

  it('setTheme 更新状态、写入 data-theme 并持久化', () => {
    useThemeStore.getState().setTheme('fresh-mint')
    expect(useThemeStore.getState().theme).toBe('fresh-mint')
    expect(document.documentElement.dataset.theme).toBe('fresh-mint')
    const raw = localStorage.getItem('agile-config-ui.theme')
    expect(JSON.parse(raw!).state.theme).toBe('fresh-mint')
  })

  it('持久化恢复时应用主题到 document（merge 钩子）', () => {
    localStorage.setItem(
      'agile-config-ui.theme',
      JSON.stringify({ state: { theme: 'navy-console' }, version: 0 })
    )
    // 模拟新会话：直接触发 persist merge 路径
    useThemeStore.persist.rehydrate()
    expect(useThemeStore.getState().theme).toBe('navy-console')
    expect(document.documentElement.dataset.theme).toBe('navy-console')
  })

  it('非法持久化值回退默认主题', () => {
    localStorage.setItem(
      'agile-config-ui.theme',
      JSON.stringify({ state: { theme: 'hacker-green' }, version: 0 })
    )
    useThemeStore.persist.rehydrate()
    expect(useThemeStore.getState().theme).toBe('graphite')
  })
})
