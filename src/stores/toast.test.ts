import { afterEach, describe, expect, it, vi } from 'vitest'
import { toast, useToastStore } from './toast'

describe('toast store', () => {
  afterEach(() => {
    useToastStore.setState({ toasts: [] })
    vi.restoreAllMocks()
  })

  it('push 添加 toast 并保留 kind/text', () => {
    toast.success('应用已创建')
    const s = useToastStore.getState()
    expect(s.toasts).toHaveLength(1)
    expect(s.toasts[0]).toMatchObject({ kind: 'success', text: '应用已创建' })
  })

  it('超过 3 条时只保留最近 3 条', () => {
    toast.info('a')
    toast.info('b')
    toast.info('c')
    toast.info('d')
    const s = useToastStore.getState()
    expect(s.toasts).toHaveLength(3)
    expect(s.toasts.map((t) => t.text)).toEqual(['b', 'c', 'd'])
  })

  it('2.6s 后自动清除', () => {
    vi.useFakeTimers()
    toast.error('失败')
    expect(useToastStore.getState().toasts).toHaveLength(1)
    vi.advanceTimersByTime(2700)
    expect(useToastStore.getState().toasts).toHaveLength(0)
    vi.useRealTimers()
  })

  it('dismiss 手动清除指定条', () => {
    toast.info('x')
    const id = useToastStore.getState().toasts[0].id
    useToastStore.getState().dismiss(id)
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })
})
