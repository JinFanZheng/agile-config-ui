import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { getApp, searchApps } from '../../api/apps'
import { Breadcrumb } from '../../components/Breadcrumb'
import { HistoryPanel } from '../publish/HistoryPanel'
import { useEnvStore } from '../../stores/env'
import { publishStr } from '../../strings/publish'

/** 应用域发布历史页：/apps/:appId/history（面包屑 应用 / 应用名 / 发布历史） */
export function AppHistoryPage() {
  const { appId = '' } = useParams()
  const env = useEnvStore((s) => s.currentEnv)
  const app = useQuery({ queryKey: ['apps', 'detail', appId], queryFn: () => getApp(appId) })

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Breadcrumb
          asHeading
          items={[
            { label: '应用', to: '/apps' },
            { label: app.data?.name ?? appId, to: `/apps/${appId}/config`, mono: true },
            { label: publishStr.history.title },
          ]}
        />
        <span className="rounded-md border border-border bg-panel px-2 py-0.5 font-mono text-xs text-muted-foreground">
          {env}
        </span>
      </div>
      <HistoryPanel appId={appId} env={env} />
    </div>
  )
}

/** 全局发布历史入口：选择应用查看（侧栏「发布历史」目标页） */
export function HistoryIndexPage() {
  const apps = useQuery({
    queryKey: ['apps', 'search', { historyPicker: true, current: 1, pageSize: 500 }],
    queryFn: () => searchApps({ current: 1, pageSize: 500 }),
  })

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5">
        <h1 className="text-base font-semibold">{publishStr.history.title}</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">{publishStr.history.subtitle}</p>
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-panel shadow-card">
        {(apps.data?.data ?? []).map((a) => (
          <Link
            key={a.id}
            to={`/apps/${a.id}/history`}
            className="flex items-center justify-between border-b border-border px-4 py-2.5 text-[13px] transition-colors last:border-b-0 hover:bg-hover"
          >
            <span>{a.name}</span>
            <span className="font-mono text-xs text-muted-foreground">{a.id}</span>
          </Link>
        ))}
        {!apps.isLoading && (apps.data?.data ?? []).length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">还没有应用</p>
        )}
      </div>
    </div>
  )
}
