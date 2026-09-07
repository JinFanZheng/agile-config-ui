import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  addNode,
  deleteNode,
  getAllNodes,
  getRemoteNodesStatus,
  NodeStatus,
  proxyAllClientsReload,
} from '../../api/ops'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Modal } from '../../components/ui/modal'
import { Skeleton, Spinner } from '../../components/ui/spinner'
import { useDirtyGuard } from '../../hooks/useDirtyGuard'
import { usePermission } from '../../hooks/usePermission'
import { ApiError } from '../../lib/http'
import { PERMISSION } from '../../lib/permissions'
import { toast } from '../../stores/toast'
import { S } from '../../strings/common'
import { nodesStr } from '../../strings/nodes'

/** 最后心跳：MM-DD HH:mm（完整时间悬浮 title） */
function formatLastEcho(t?: string | null) {
  if (!t) return '—'
  const s = t.replace('T', ' ')
  return s.length >= 16 ? s.slice(5, 16) : s
}

type ConfirmState = { kind: 'reload'; address: string } | { kind: 'delete'; address: string } | null

/** 节点管理：列表 + 添加节点 + 重载客户端 / 删除（危险动作二次确认） */
export function NodesPage() {
  const { can } = usePermission()
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmState>(null)

  // 节点列表（{success,data} 信封）
  const nodesQuery = useQuery({
    queryKey: ['nodes', 'all'],
    queryFn: getAllNodes,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  // 各节点状态 + 在线客户端数（裸数组），按 address 合并展示
  const statusQuery = useQuery({
    queryKey: ['nodes', 'remoteStatus'],
    queryFn: getRemoteNodesStatus,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const clientCountByAddress = new Map<string, number>()
  for (const item of statusQuery.data ?? []) {
    if (item.n?.address)
      clientCountByAddress.set(item.n.address, item.server_status?.clientCount ?? 0)
  }

  const rows = nodesQuery.data ?? []

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['nodes'] })

  const reloadMutation = useMutation({
    mutationFn: (address: string) => proxyAllClientsReload(address),
    onSuccess: (_data, address) => toast.success(nodesStr.toasts.reloaded(address)),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : nodesStr.toasts.failed),
  })
  const deleteMutation = useMutation({
    mutationFn: (address: string) => deleteNode(address),
    onSuccess: (_data, address) => {
      toast.success(nodesStr.toasts.deleted(address))
      invalidate()
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : nodesStr.toasts.failed),
  })

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start gap-3">
        <div>
          <h1 className="text-base font-semibold">{nodesStr.title}</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">{nodesStr.subtitle}</p>
        </div>
        <div className="ml-auto">
          {can(PERMISSION.NodeAdd) && (
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              {nodesStr.add}
            </Button>
          )}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="ml-auto text-xs text-muted-foreground">{nodesStr.count(rows.length)}</div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-panel shadow-card">
        <table className="w-full min-w-[720px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-border bg-elevated text-left text-xs text-muted-foreground [&>th]:whitespace-nowrap">
              <th className="px-4 py-2 font-medium">{nodesStr.table.address}</th>
              <th className="px-4 py-2 font-medium">{nodesStr.table.remark}</th>
              <th className="w-[72px] px-4 py-2 font-medium whitespace-nowrap">{nodesStr.table.status}</th>
              <th className="px-4 py-2 font-medium">{nodesStr.table.lastEcho}</th>
              <th className="px-4 py-2 font-medium">{nodesStr.table.clientCount}</th>
              <th className="px-4 py-2 text-right font-medium">{nodesStr.table.actions}</th>
            </tr>
          </thead>
          <tbody>
            {nodesQuery.isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-border last:border-b-0">
                  <td colSpan={6} className="px-4 py-3">
                    <Skeleton className="h-4 w-full" />
                  </td>
                </tr>
              ))
            ) : nodesQuery.isError ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center">
                  <p className="text-xs text-danger">
                    {nodesQuery.error instanceof ApiError
                      ? nodesQuery.error.message
                      : nodesStr.loadFailed}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => nodesQuery.refetch()}
                  >
                    {S.retry}
                  </Button>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <p className="text-sm text-muted-foreground">{nodesStr.emptyTitle}</p>
                  <Button size="sm" className="mt-3" onClick={() => setAddOpen(true)}>
                    {nodesStr.emptyAction}
                  </Button>
                </td>
              </tr>
            ) : (
              rows.map((node) => (
                <tr
                  key={node.address}
                  className="border-b border-border transition-colors last:border-b-0 hover:bg-hover"
                >
                  <td className="px-4 py-[7px]">
                    <span className="font-mono text-xs">{node.address}</span>
                  </td>
                  <td className="px-4 py-[7px] text-xs text-muted-foreground">
                    {node.remark || '—'}
                  </td>
                  <td className="px-4 py-[7px]">
                    <span
                      className={
                        node.status === NodeStatus.Online
                          ? 'rounded bg-success/10 px-1.5 py-0.5 text-[10px] whitespace-nowrap text-success'
                          : 'rounded bg-danger/10 px-1.5 py-0.5 text-[10px] whitespace-nowrap text-danger'
                      }
                    >
                      {node.status === NodeStatus.Online
                        ? nodesStr.badges.online
                        : nodesStr.badges.offline}
                    </span>
                  </td>
                  <td
                    className="px-4 py-[7px] text-xs text-muted-foreground"
                    title={node.lastEchoTime ?? undefined}
                  >
                    {formatLastEcho(node.lastEchoTime)}
                  </td>
                  <td className="px-4 py-[7px] text-xs text-muted-foreground">
                    {clientCountByAddress.get(node.address) ?? '—'}
                  </td>
                  <td className="px-4 py-[7px] text-right">
                    <div className="flex items-center justify-end gap-1 [&>button]:whitespace-nowrap [&>a]:whitespace-nowrap">
                      {can(PERMISSION.ClientRefresh) && (
                        <button
                          type="button"
                          className="rounded px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
                          onClick={() => setConfirm({ kind: 'reload', address: node.address })}
                        >
                          {nodesStr.actions.reloadClients}
                        </button>
                      )}
                      {can(PERMISSION.NodeDelete) && (
                        <button
                          type="button"
                          className="rounded px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-hover hover:text-danger"
                          onClick={() => setConfirm({ kind: 'delete', address: node.address })}
                        >
                          {nodesStr.actions.delete}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AddNodeDialog open={addOpen} onClose={() => setAddOpen(false)} />

      {confirm?.kind === 'reload' && (
        <ConfirmDialog
          open
          danger
          title={nodesStr.confirm.reloadTitle}
          body={nodesStr.confirm.reloadBody(confirm.address)}
          confirmText={nodesStr.actions.reloadClients}
          busy={reloadMutation.isPending}
          onCancel={() => setConfirm(null)}
          onConfirm={() =>
            reloadMutation.mutate(confirm.address, { onSuccess: () => setConfirm(null) })
          }
        />
      )}
      {confirm?.kind === 'delete' && (
        <ConfirmDialog
          open
          danger
          title={nodesStr.confirm.deleteTitle}
          body={nodesStr.confirm.deleteBody(confirm.address)}
          confirmText={nodesStr.actions.delete}
          busy={deleteMutation.isPending}
          onCancel={() => setConfirm(null)}
          onConfirm={() =>
            deleteMutation.mutate(confirm.address, { onSuccess: () => setConfirm(null) })
          }
        />
      )}
    </div>
  )
}

/** 添加节点：受控表单（地址必填 / 备注选填），错误透出服务端 message */
function AddNodeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [address, setAddress] = useState('')
  const [remark, setRemark] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setAddress('')
    setRemark('')
    setError(null)
  }, [open])

  const mutation = useMutation({
    mutationFn: (values: { address: string; remark?: string }) =>
      addNode(values.address, values.remark),
    onSuccess: (_data, values) => {
      toast.success(nodesStr.toasts.added(values.address))
      void queryClient.invalidateQueries({ queryKey: ['nodes'] })
      onClose() // 保存成功直接关闭（绕过脏守卫）
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : nodesStr.toasts.failed),
  })

  const isDirty = address.trim() !== '' || remark.trim() !== ''
  const { requestClose, guardNode } = useDirtyGuard(onClose, isDirty)

  const submit = () => {
    const addr = address.trim()
    if (!addr) {
      setError(nodesStr.errors.addressRequired)
      return
    }
    mutation.mutate({ address: addr, remark: remark.trim() || undefined })
  }

  return (
    <Modal open={open} title={nodesStr.dialog.title} onClose={requestClose}>
      {guardNode}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        noValidate
        className="flex flex-col gap-4"
      >
        {error && (
          <div
            role="alert"
            className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger"
          >
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="node-address">{nodesStr.dialog.address}</Label>
          <Input
            id="node-address"
            autoFocus
            className="font-mono"
            placeholder={nodesStr.dialog.addressPlaceholder}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="node-remark">{nodesStr.dialog.remark}</Label>
          <Input
            id="node-remark"
            placeholder={nodesStr.dialog.remarkPlaceholder}
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
          />
        </div>

        <div className="mt-1 flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={requestClose}
            disabled={mutation.isPending}
          >
            {S.cancel}
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Spinner />}
            {mutation.isPending ? nodesStr.dialog.submitting : nodesStr.dialog.submit}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
