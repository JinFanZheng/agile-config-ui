import { useQuery } from '@tanstack/react-query'
import { getConfigPublishedHistory } from '../../api/publish'
import type { ConfigItem } from '../../api/configs'
import { Modal } from '../../components/ui/modal'
import { Skeleton } from '../../components/ui/spinner'
import { publishStr } from '../../strings/publish'

/** 单条配置的发布历史（值随版本的演变） */
export function ConfigHistoryDialog({
  config,
  env,
  onClose,
}: {
  config: ConfigItem | null
  env: string
  onClose: () => void
}) {
  const q = useQuery({
    queryKey: ['publish', 'configHistory', config?.id, env],
    queryFn: () => getConfigPublishedHistory(config!.id, env),
    enabled: config !== null,
    staleTime: 0,
  })

  return (
    <Modal
      open={config !== null}
      onClose={onClose}
      title={publishStr.itemHistory.title(config?.key ?? '')}
      width="max-w-xl"
    >
      {q.isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : (q.data ?? []).length === 0 ? (
        <p className="px-2 py-6 text-center text-sm text-muted-foreground">
          {publishStr.itemHistory.empty}
        </p>
      ) : (
        <div className="max-h-80 overflow-y-auto">
          {(q.data ?? []).map((item, i) => (
            <div key={i} className="border-b border-border py-2 last:border-b-0">
              <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded bg-elevated px-1.5 py-0.5 font-mono font-semibold text-foreground">
                  {publishStr.history.version(item.timelineNode?.version ?? '?')}
                </span>
                <span>{item.timelineNode?.publishUserName ?? '—'}</span>
                <span>·</span>
                <span>{item.timelineNode?.publishTime?.slice(0, 19).replace('T', ' ') ?? '—'}</span>
                {item.timelineNode?.log && (
                  <span className="truncate">· {item.timelineNode.log}</span>
                )}
              </div>
              <p className="break-all rounded bg-input/50 px-2 py-1.5 font-mono text-xs text-foreground">
                {item.config.value}
              </p>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
