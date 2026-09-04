import { cn } from '../lib/utils'
import { useEnvStore, type EnvId } from '../stores/env'
import { layoutStr } from '../strings/layout'

/**
 * 全局环境切换器（UX #1）：顶栏常驻，所有配置相关页面跟随；
 * 环境语义色 DEV 绿 / TEST 橙 / PROD 红（设计令牌 §7.1，跨主题不变）。
 * 与顶栏其他控件严格同高（h-7，border-box）。
 */
const ENVS: { id: EnvId; dotClass: string }[] = [
  { id: 'DEV', dotClass: 'bg-env-dev' },
  { id: 'TEST', dotClass: 'bg-env-test' },
  { id: 'PROD', dotClass: 'bg-env-prod' },
]

export function EnvSwitcher() {
  const currentEnv = useEnvStore((s) => s.currentEnv)
  const setEnv = useEnvStore((s) => s.setEnv)

  return (
    <div
      className="inline-flex h-7 items-stretch overflow-hidden rounded-md border border-border bg-panel"
      role="radiogroup"
      aria-label="环境切换"
    >
      {ENVS.map(({ id, dotClass }) => {
        const active = currentEnv === id
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setEnv(id)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 font-mono text-xs transition-colors duration-150 ease-out',
              id !== 'DEV' && 'border-l border-border',
              active
                ? 'bg-elevated font-medium text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', dotClass)} />
            {layoutStr.env[id]}
          </button>
        )
      })}
    </div>
  )
}
