import { AlertTriangle, RefreshCw } from 'lucide-react'
import { useEffect } from 'react'
import { isRouteErrorResponse, useRouteError, useNavigate } from 'react-router'
import { S } from '../strings/common'

/** 过期懒加载 chunk（新构建上线后旧标签页拉旧 hash 文件 404）的匹配 */
const STALE_CHUNK_RE =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i

/** 自动整页刷新的防循环标记（10 秒内只自动刷一次，避免拦截场景死循环） */
const CHUNK_RELOADED_AT = 'agile-config-ui.chunk-reloaded-at'
const CHUNK_RELOAD_DEBOUNCE_MS = 10_000

/**
 * 路由级错误页（router errorElement）：替代 React Router 英文默认页。
 * 三类：应用更新（过期 chunk，自动 reload 一次）／404／意外错误。文案见 strings/common。
 */
export function RouterErrorPage() {
  const error = useRouteError()
  const navigate = useNavigate()
  const isStaleChunk = error instanceof Error && STALE_CHUNK_RE.test(error.message)

  useEffect(() => {
    if (!isStaleChunk) return
    try {
      const last = Number(sessionStorage.getItem(CHUNK_RELOADED_AT) ?? 0)
      if (Date.now() - last > CHUNK_RELOAD_DEBOUNCE_MS) {
        sessionStorage.setItem(CHUNK_RELOADED_AT, String(Date.now()))
        window.location.reload()
      }
    } catch {
      // sessionStorage 不可用：跳过自动刷新，仍可手动点击
    }
  }, [isStaleChunk])

  const title = isStaleChunk
    ? S.routeError.updatedTitle
    : isRouteErrorResponse(error) && error.status === 404
      ? S.routeError.notFoundTitle
      : S.routeError.unexpectedTitle
  const body = isStaleChunk
    ? S.routeError.updatedBody
    : isRouteErrorResponse(error) && error.status === 404
      ? S.routeError.notFoundBody
      : S.routeError.unexpectedBody

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-page p-6 text-foreground">
      <AlertTriangle className="h-6 w-6 text-warning" aria-hidden />
      <h1 className="text-base font-semibold">{title}</h1>
      <p className="max-w-md text-center text-xs leading-relaxed text-muted-foreground">{body}</p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex h-7 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors duration-150 ease-out hover:bg-primary-hover"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {isStaleChunk ? S.routeError.updatedAction : S.routeError.reload}
        </button>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex h-7 items-center rounded-md border border-border px-3 text-xs text-muted-foreground transition-colors duration-150 ease-out hover:bg-hover hover:text-foreground"
        >
          {S.routeError.backHome}
        </button>
      </div>
    </div>
  )
}

/** 供单测使用：导出匹配规则（chunk 失效判定与文案分支解耦） */
export { STALE_CHUNK_RE }
