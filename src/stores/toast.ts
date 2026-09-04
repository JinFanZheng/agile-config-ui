import { create } from 'zustand'

export type ToastKind = 'success' | 'error' | 'info'

export interface ToastItem {
  id: number
  kind: ToastKind
  text: string
}

interface ToastState {
  toasts: ToastItem[]
  push: (kind: ToastKind, text: string) => void
  dismiss: (id: number) => void
}

let nextId = 1

/**
 * 轻量全局 Toast（交互规范：变更类操作的成功/失败反馈，2.6s 自动消失）。
 * 就地反馈（如复制成功）用内联状态，不走 Toast。
 */
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (kind, text) => {
    const id = nextId++
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, kind, text }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, 2600)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export const toast = {
  success: (text: string) => useToastStore.getState().push('success', text),
  error: (text: string) => useToastStore.getState().push('error', text),
  info: (text: string) => useToastStore.getState().push('info', text),
}
