import { useQuery } from '@tanstack/react-query'
import { cn } from '../lib/utils'
import { getSys } from '../api/ops'
import { useEnvStore, type EnvId } from '../stores/env'

/** 内置回退环境（Home/Sys 不可达或未配置时） */
const FALLBACK_ENVS: EnvId[] = ['DEV', 'TEST', 'PROD']

/** 环境语义色（handoff §7.1 不变量）；自定义环境用中性色 */
const ENV_DOT: Record<string, string> = {
  DEV: 'bg-env-dev',
  TEST: 'bg-env-test',
  PROD: 'bg-env-prod',
}

/**
 * 全局环境切换器（UX #1）：顶栏常驻，所有配置相关页面跟随。
 * 环境清单以 Home/Sys 的 envList 为准（待核实 #5 定案：服务端可配置），未知环境中性色。
 * 与顶栏其他控件严格同高（h-7，border-box）。
 */
export function EnvSwitcher() {
  const currentEnv = useEnvStore((s) => s.currentEnv)
  const setEnv = useEnvStore((s) => s.setEnv)

  const sys = useQuery({ queryKey: ['ops', 'sys'], queryFn: getSys, staleTime: 5 * 60_000 })
  const envs = sys.data?.envList?.length ? sys.data.envList : FALLBACK_ENVS

  return (
    <div
      className="inline-flex h-7 items-stretch overflow-hidden rounded-md border border-border bg-panel"
      role="radiogroup"
      aria-label="环境切换"
    >
      {envs.map((id) => {
        const active = currentEnv === id
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setEnv(id)}
            className={cn(
              'flex items-center gap-1.5 px-2 font-mono text-xs transition-colors duration-150 ease-out md:px-2.5',
              id !== envs[0] && 'border-l border-border',
              active
                ? 'bg-selected font-medium text-selected-foreground'
                : 'text-muted-foreground hover:bg-hover hover:text-foreground'
            )}
          >
            <span
              className={cn('h-1.5 w-1.5 rounded-full', ENV_DOT[id] ?? 'bg-muted-foreground')}
            />
            {id}
          </button>
        )
      })}
    </div>
  )
}
