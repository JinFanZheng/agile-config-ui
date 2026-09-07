import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** 环境标识（待核实 #5 定案：环境清单服务端可配置，EnvSwitcher 以 Home/Sys 的 envList 为准） */
export type EnvId = string

interface EnvState {
  currentEnv: EnvId
  setEnv: (env: EnvId) => void
}

/**
 * 全局当前环境（UX #1：顶栏常驻切换器，所有配置相关页面跟随）。
 * 环境清单由 EnvSwitcher 从 Home/Sys 动态获取，此处只存当前选择。
 */
export const useEnvStore = create<EnvState>()(
  persist(
    (set) => ({
      currentEnv: 'DEV',
      setEnv: (currentEnv) => set({ currentEnv }),
    }),
    { name: 'agile-config-ui.env' }
  )
)
