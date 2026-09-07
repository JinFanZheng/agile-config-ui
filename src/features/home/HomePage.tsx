import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { getAppCount, getConfigCount, getNodeCount, getServiceCount, getSys } from '../../api/ops'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, FieldRow } from '../../components/ui/card'
import { Skeleton } from '../../components/ui/spinner'
import { ApiError } from '../../lib/http'
import { cn } from '../../lib/utils'
import { useAuthStore } from '../../stores/auth'
import { S } from '../../strings/common'
import { overviewStr } from '../../strings/overview'

/** 统计类查询：30s 新鲜窗口 + 60s 轮询（观察者随页面卸载移除，轮询自动停止） */
const STATS_OPTIONS = { staleTime: 30_000, refetchInterval: 60_000 } as const

/** 系统信息（版本/SSO/环境清单）近乎静态，不轮询，放宽到 5 分钟 */
const SYS_OPTIONS = { staleTime: 300_000 } as const

/** 环境语义色（DEV 绿 / TEST 橙 / PROD 红，跨主题不变）；未知环境用中性点兜底 */
const ENV_DOT_CLASS: Record<string, string> = {
  DEV: 'bg-env-dev',
  TEST: 'bg-env-test',
  PROD: 'bg-env-prod',
}

/** 统计卡查询的最小结构（避免绑定具体 data 泛型） */
interface StatQueryLike {
  isLoading: boolean
  isError: boolean
  error: unknown
  refetch: () => unknown
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('zh-CN', { hour12: false })
}

/** 统计卡：标题 + 骨架加载 + 失败重试 + 大号 tabular-nums 数值 */
function StatCard({
  title,
  query,
  children,
}: {
  title: string
  query: StatQueryLike
  children?: ReactNode
}) {
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <Skeleton className="h-9 w-20" />
        ) : query.isError ? (
          <div className="flex flex-col items-start gap-2">
            <p className="text-xs text-danger">
              {query.error instanceof ApiError ? query.error.message : overviewStr.loadFailed}
            </p>
            <Button size="sm" variant="outline" onClick={() => query.refetch()}>
              {S.retry}
            </Button>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}

export function HomePage() {
  const user = useAuthStore((s) => s.user)

  const appCount = useQuery({
    queryKey: ['ops', 'appCount'],
    queryFn: getAppCount,
    ...STATS_OPTIONS,
  })
  const configCount = useQuery({
    queryKey: ['ops', 'configCount'],
    queryFn: getConfigCount,
    ...STATS_OPTIONS,
  })
  const nodeCount = useQuery({
    queryKey: ['ops', 'nodeCount'],
    queryFn: getNodeCount,
    ...STATS_OPTIONS,
  })
  const serviceCount = useQuery({
    queryKey: ['ops', 'serviceCount'],
    queryFn: getServiceCount,
    ...STATS_OPTIONS,
  })
  const sys = useQuery({ queryKey: ['ops', 'sys'], queryFn: getSys, ...SYS_OPTIONS })

  const refreshedAt = Math.max(
    appCount.dataUpdatedAt,
    configCount.dataUpdatedAt,
    nodeCount.dataUpdatedAt,
    serviceCount.dataUpdatedAt
  )
  const envList = sys.data?.envList ?? []

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start gap-3">
        <div>
          <h1 className="text-base font-semibold">{overviewStr.title}</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">{overviewStr.subtitle}</p>
        </div>
        {refreshedAt > 0 && (
          <p className="ml-auto text-xs text-muted-foreground">
            {overviewStr.stats.autoRefreshHint} ·{' '}
            {overviewStr.stats.refreshedAt(formatTime(refreshedAt))}
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title={overviewStr.stats.apps} query={appCount}>
          <p className="py-1 text-2xl font-semibold tabular-nums">{appCount.data}</p>
        </StatCard>
        <StatCard title={overviewStr.stats.configs} query={configCount}>
          <p className="py-1 text-2xl font-semibold tabular-nums">{configCount.data}</p>
        </StatCard>
        <StatCard title={overviewStr.stats.nodes} query={nodeCount}>
          <p className="py-1 text-2xl font-semibold tabular-nums">{nodeCount.data}</p>
        </StatCard>
        <StatCard title={overviewStr.stats.services} query={serviceCount}>
          <p className="py-1 text-2xl font-semibold tabular-nums">
            {serviceCount.data?.serviceOnCount}/{serviceCount.data?.serviceCount}
          </p>
          <p className="text-xs text-muted-foreground">{overviewStr.stats.servicesHint}</p>
        </StatCard>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>{overviewStr.sys.title}</CardTitle>
          </CardHeader>
          <CardContent>
            {sys.isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : sys.isError ? (
              <div className="flex flex-col items-start gap-2">
                <p className="text-xs text-danger">
                  {sys.error instanceof ApiError ? sys.error.message : overviewStr.loadFailed}
                </p>
                <Button size="sm" variant="outline" onClick={() => sys.refetch()}>
                  {S.retry}
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                <FieldRow label={overviewStr.sys.version}>
                  <span className="font-mono">{sys.data?.appVer || '—'}</span>
                </FieldRow>
                <FieldRow label={overviewStr.sys.sso}>
                  {sys.data?.ssoEnabled ? (
                    <span className="rounded bg-success/10 px-1.5 py-0.5 text-[10px] text-success">
                      {overviewStr.sys.ssoOn}
                    </span>
                  ) : (
                    <span className="rounded bg-elevated px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {overviewStr.sys.ssoOff}
                    </span>
                  )}
                </FieldRow>
                <FieldRow label={overviewStr.sys.envs}>
                  {envList.length > 0 ? (
                    <span className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
                      {envList.map((env) => (
                        <span key={env} className="flex items-center gap-1 font-mono">
                          <span
                            className={cn(
                              'h-1.5 w-1.5 rounded-full',
                              ENV_DOT_CLASS[env.toUpperCase()] ?? 'bg-muted-foreground'
                            )}
                          />
                          {env}
                        </span>
                      ))}
                    </span>
                  ) : (
                    '—'
                  )}
                </FieldRow>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>{overviewStr.session.title}</CardTitle>
          </CardHeader>
          <CardContent>
            {user ? (
              <div className="divide-y divide-border">
                <FieldRow label={overviewStr.session.userName}>
                  <span className="font-mono">{user.userName}</span>
                </FieldRow>
                <FieldRow label={overviewStr.session.roles}>
                  {user.roles.length > 0 ? (
                    <span className="font-mono">{user.roles.join(', ')}</span>
                  ) : (
                    overviewStr.session.noRole
                  )}
                </FieldRow>
                <FieldRow label={overviewStr.session.functions}>
                  {overviewStr.session.functionsCount(user.functions.length)}
                </FieldRow>
              </div>
            ) : (
              <Skeleton className="h-20 w-full" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
