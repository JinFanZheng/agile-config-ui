import { useQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { searchApps } from '../../api/apps'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, FieldRow } from '../../components/ui/card'
import { Skeleton } from '../../components/ui/spinner'
import { API_BASE, ApiError } from '../../lib/http'
import { useAuthStore } from '../../stores/auth'
import { S } from '../../strings/common'
import { homeStr } from '../../strings/layout'

export function HomePage() {
  const user = useAuthStore((s) => s.user)

  // 已认证请求冒烟：应用总数同时证明 代理 + Bearer + 信封解包 全链路可用
  const apps = useQuery({
    queryKey: ['apps', 'search', { current: 1, pageSize: 1 }],
    queryFn: () => searchApps({ current: 1, pageSize: 1 }),
    select: (page) => page.total,
  })

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-base font-semibold">{homeStr.title}</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">{homeStr.subtitle}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>{homeStr.sessionCard}</CardTitle>
          </CardHeader>
          <CardContent>
            {user ? (
              <div className="divide-y divide-border">
                <FieldRow label={homeStr.userName}>
                  <span className="font-mono">{user.userName}</span>
                </FieldRow>
                <FieldRow label={homeStr.roles}>
                  {user.roles.length > 0 ? (
                    <span className="font-mono">{user.roles.join(', ')}</span>
                  ) : (
                    homeStr.noRole
                  )}
                </FieldRow>
                <FieldRow label={homeStr.functions}>
                  {homeStr.functionsCount(user.functions.length)}
                </FieldRow>
              </div>
            ) : (
              <Skeleton className="h-16 w-full" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{homeStr.appsCard}</CardTitle>
          </CardHeader>
          <CardContent>
            {apps.isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : apps.isError ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-danger">
                  {apps.error instanceof ApiError ? apps.error.message : S.loading}
                </p>
                <Button size="sm" variant="outline" onClick={() => apps.refetch()}>
                  {S.retry}
                </Button>
              </div>
            ) : (
              <>
                <p className="py-1 text-xl font-semibold tabular-nums">{apps.data}</p>
                <p className="text-xs text-muted-foreground">{homeStr.appsCount(apps.data ?? 0)}</p>
                <Link
                  to="/apps"
                  className="mt-3 inline-flex items-center gap-1 text-xs text-primary transition-colors duration-150 hover:text-primary-hover"
                >
                  {homeStr.goApps}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{homeStr.backendCard}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              <FieldRow label="API">
                <span className="font-mono">{API_BASE || homeStr.sameOrigin}</span>
              </FieldRow>
              <FieldRow label={homeStr.appsCard}>{homeStr.appsComingSoon}</FieldRow>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
