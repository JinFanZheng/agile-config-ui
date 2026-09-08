import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useMediaQuery } from './useMediaQuery'

function mockMatchMedia(matches: boolean) {
  const listeners: Array<(e: { matches: boolean }) => void> = []
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((q: string) => ({
      matches: q === '(max-width: 767px)' ? matches : false,
      addEventListener: (_t: string, fn: (e: { matches: boolean }) => void) => listeners.push(fn),
      removeEventListener: () => {},
    }))
  )
  return (next: boolean) => listeners.forEach((fn) => fn({ matches: next }))
}

afterEach(() => vi.unstubAllGlobals())

describe('useMediaQuery', () => {
  it('返回初始匹配状态', () => {
    mockMatchMedia(true)
    const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'))
    expect(result.current).toBe(true)
  })

  it('matchMedia 缺失时安全回退 false', () => {
    vi.stubGlobal('matchMedia', undefined)
    const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'))
    expect(result.current).toBe(false)
  })

  it('媒体状态变化时更新', () => {
    const fire = mockMatchMedia(false)
    const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'))
    expect(result.current).toBe(false)
    act(() => fire(true))
    expect(result.current).toBe(true)
  })
})
