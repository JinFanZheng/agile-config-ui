import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type EnvId = 'DEV' | 'TEST' | 'PROD'

interface EnvState {
  currentEnv: EnvId
  setEnv: (env: EnvId) => void
}

/**
 * 全局当前环境（UX #1：顶栏常驻切换器，所有配置相关页面跟随）。
 * 环境清单是否可配置待核实（handoff §12 #5），当前先内置三套，收敛在此常量便于替换。
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
