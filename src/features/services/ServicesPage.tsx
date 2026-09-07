import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  addService,
  removeService,
  searchServices,
  ServiceStatus,
  type ServiceItem,
} from '../../api/service'
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
import { servicesStr } from '../../strings/services'

const PAGE_SIZE = 20

/** 时间 → YYYY-MM-DD HH:mm（完整时间悬浮 title） */
function formatMinute(t?: string | null) {
  if (!t) return '—'
  const s = t.replace('T', ' ')
  return s.length >= 16 ? s.slice(0, 16) : s
}

/** 心跳方式显示文案（未知值原样透出） */
function heartBeatLabel(mode?: string) {
  if (mode === 'tcp') return servicesStr.heartBeat.tcp
  if (mode === 'url') return servicesStr.heartBeat.url
  return mode || '—'
}

/** 服务注册中心：搜索过滤 + 手动注册 + 移除（危险动作二次确认） */
export function ServicesPage() {
  const queryClient = useQueryClient()
  const { can } = usePermission()
  const [nameInput, setNameInput] = useState('')
  const [idInput, setIdInput] = useState('')
  const [name, setName] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [addOpen, setAddOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<ServiceItem | null>(null)

  // 搜索防抖 300ms（UX #7），清空关键词 = 清除过滤
  useEffect(() => {
    const t = setTimeout(() => {
      setName(nameInput.trim())
      setServiceId(idInput.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [nameInput, idInput])

  const search = useQuery({
    queryKey: [
      'services',
      'search',
      { serviceName: name, serviceId, status, current: page, pageSize: PAGE_SIZE },
    ],
    queryFn: () =>
      searchServices({
        serviceName: name || undefined,
        serviceId: serviceId || undefined,
        status: status === '' ? undefined : Number(status),
        current: page,
        pageSize: PAGE_SIZE,
      }),
    refetchInterval: 10_000,
  })

  const rows = search.data?.data ?? []
  const total = search.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const hasFilter = name !== '' || serviceId !== '' || status !== ''

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['services'] })

  const removeMutation = useMutation({
    mutationFn: (svc: ServiceItem) => removeService(svc.id),
    onSuccess: (_data, svc) => {
      toast.success(servicesStr.toasts.removed(svc.serviceName || svc.serviceId))
      // 删除当前页最后一条时回退一页，避免空页
      if (rows.length === 1 && page > 1) setPage(page - 1)
      invalidate()
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : servicesStr.toasts.failed),
  })

  const clearFilter = () => {
    setNameInput('')
    setIdInput('')
    setName('')
    setServiceId('')
    setStatus('')
    setPage(1)
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start gap-3">
        <div>
          <h1 className="text-base font-semibold">{servicesStr.title}</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">{servicesStr.subtitle}</p>
        </div>
        <div className="ml-auto">
          {can(PERMISSION.ServiceAdd) && (
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              {servicesStr.add}
            </Button>
          )}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input
          className="w-full max-w-xs sm:w-auto"
          placeholder={servicesStr.searchNamePlaceholder}
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          onKeyDown={(e) => {
            // 回车立即触发，绕过防抖等待
            if (e.key === 'Enter') {
              setName(nameInput.trim())
              setServiceId(idInput.trim())
              setPage(1)
            }
          }}
        />
        <Input
          className="w-full max-w-xs sm:w-auto"
          placeholder={servicesStr.searchIdPlaceholder}
          value={idInput}
          onChange={(e) => setIdInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setName(nameInput.trim())
              setServiceId(idInput.trim())
              setPage(1)
            }
          }}
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(1)
          }}
          className="h-8 rounded-md border border-border bg-input px-2 text-xs text-foreground outline-none focus-visible:border-primary"
          aria-label={servicesStr.statusLabel}
        >
          <option value="">{servicesStr.statusAll}</option>
          <option value={String(ServiceStatus.Healthy)}>{servicesStr.badges.healthy}</option>
          <option value={String(ServiceStatus.Unhealthy)}>{servicesStr.badges.unhealthy}</option>
        </select>
        <div className="ml-auto text-xs text-muted-foreground">{servicesStr.count(total)}</div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-panel shadow-card">
        <table className="w-full min-w-[880px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-border bg-elevated text-left text-xs text-muted-foreground">
              <th className="w-[200px] max-w-[220px] px-4 py-2 font-medium">
                {servicesStr.table.name}
              </th>
              <th className="w-[200px] max-w-[220px] px-4 py-2 font-medium">
                {servicesStr.table.serviceId}
              </th>
              <th className="w-[180px] max-w-[200px] px-4 py-2 font-medium">
                {servicesStr.table.instance}
              </th>
              <th className="w-[88px] px-4 py-2 font-medium whitespace-nowrap">
                {servicesStr.table.status}
              </th>
              <th className="w-[96px] px-4 py-2 font-medium whitespace-nowrap">
                {servicesStr.table.heartBeatMode}
              </th>
              <th className="w-[132px] px-4 py-2 font-medium whitespace-nowrap">
                {servicesStr.table.registerTime}
              </th>
              <th className="w-[132px] px-4 py-2 font-medium whitespace-nowrap">
                {servicesStr.table.lastHeartBeat}
              </th>
              <th className="px-4 py-2 text-right font-medium">{servicesStr.table.actions}</th>
            </tr>
          </thead>
          <tbody>
            {search.isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-border last:border-b-0">
                  <td colSpan={8} className="px-4 py-3">
                    <Skeleton className="h-4 w-full" />
                  </td>
                </tr>
              ))
            ) : search.isError ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center">
                  <p className="text-xs text-danger">
                    {search.error instanceof ApiError
                      ? search.error.message
                      : servicesStr.loadFailed}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => search.refetch()}
                  >
                    {S.retry}
                  </Button>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center">
                  {hasFilter ? (
                    <>
                      <p className="text-sm text-muted-foreground">{servicesStr.noMatchTitle}</p>
                      <Button size="sm" variant="outline" className="mt-3" onClick={clearFilter}>
                        {servicesStr.clearFilter}
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">{servicesStr.emptyTitle}</p>
                      <p className="mt-1 text-xs text-muted-foreground/70">
                        {servicesStr.emptyHint}
                      </p>
                      {can(PERMISSION.ServiceAdd) && (
                        <Button size="sm" className="mt-3" onClick={() => setAddOpen(true)}>
                          {servicesStr.emptyAction}
                        </Button>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ) : (
              rows.map((svc) => {
                const instance = svc.ip ? (svc.port ? `${svc.ip}:${svc.port}` : svc.ip) : ''
                return (
                  <tr
                    key={svc.id}
                    className="border-b border-border transition-colors last:border-b-0 hover:bg-hover"
                  >
                    <td className="max-w-[220px] px-4 py-[7px]">
                      <span className="block truncate" title={svc.serviceName}>
                        {svc.serviceName || '—'}
                      </span>
                    </td>
                    <td className="max-w-[220px] px-4 py-[7px]">
                      <span className="block truncate font-mono text-xs" title={svc.serviceId}>
                        {svc.serviceId || '—'}
                      </span>
                    </td>
                    <td className="max-w-[200px] px-4 py-[7px]">
                      <span
                        className="block truncate font-mono text-xs"
                        title={instance || undefined}
                      >
                        {instance || '—'}
                      </span>
                    </td>
                    <td className="w-[88px] px-4 py-[7px] whitespace-nowrap">
                      <span
                        className={
                          svc.status === ServiceStatus.Healthy
                            ? 'rounded bg-success/10 px-1.5 py-0.5 text-[10px] text-success'
                            : 'rounded bg-danger/10 px-1.5 py-0.5 text-[10px] text-danger'
                        }
                      >
                        {svc.status === ServiceStatus.Healthy
                          ? servicesStr.badges.healthy
                          : servicesStr.badges.unhealthy}
                      </span>
                    </td>
                    <td className="px-4 py-[7px] text-xs whitespace-nowrap text-muted-foreground">
                      {heartBeatLabel(svc.heartBeatMode)}
                    </td>
                    <td
                      className="px-4 py-[7px] text-xs whitespace-nowrap text-muted-foreground"
                      title={svc.registerTime ?? undefined}
                    >
                      {formatMinute(svc.registerTime)}
                    </td>
                    <td
                      className="px-4 py-[7px] text-xs whitespace-nowrap text-muted-foreground"
                      title={svc.lastHeartBeat ?? undefined}
                    >
                      {formatMinute(svc.lastHeartBeat)}
                    </td>
                    <td className="px-4 py-[7px] text-right">
                      <div className="flex items-center justify-end gap-1">
                        {can(PERMISSION.ServiceDelete) && (
                          <button
                            type="button"
                            className="rounded px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-hover hover:text-danger"
                            onClick={() => setRemoveTarget(svc)}
                          >
                            {servicesStr.actions.remove}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        {total > PAGE_SIZE && (
          <div className="flex items-center justify-end gap-3 border-t border-border px-4 py-2 text-xs text-muted-foreground">
            <span>
              {page} / {totalPages}
            </span>
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <AddServiceDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => {
          // ISSUE-001：注册成功清除过滤词与页码，确保新服务立即可见
          setNameInput('')
          setIdInput('')
          setName('')
          setServiceId('')
          setStatus('')
          setPage(1)
        }}
      />

      {removeTarget && (
        <ConfirmDialog
          open
          danger
          title={servicesStr.confirm.removeTitle}
          body={servicesStr.confirm.removeBody(removeTarget.serviceName || removeTarget.serviceId)}
          confirmText={servicesStr.actions.remove}
          busy={removeMutation.isPending}
          onCancel={() => setRemoveTarget(null)}
          onConfirm={() =>
            removeMutation.mutate(removeTarget, { onSuccess: () => setRemoveTarget(null) })
          }
        />
      )}
    </div>
  )
}

/** 手动注册服务：服务ID/服务名必填，实例与探活信息选填；错误透出服务端 message */
function AddServiceDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  /** 注册成功回调（调用方借此清除过滤词，避免新服务被残留过滤器隐藏） */
  onCreated?: () => void
}) {
  const queryClient = useQueryClient()
  const [serviceId, setServiceId] = useState('')
  const [serviceName, setServiceName] = useState('')
  const [ip, setIp] = useState('')
  const [port, setPort] = useState('')
  const [heartBeatMode, setHeartBeatMode] = useState('url')
  const [checkUrl, setCheckUrl] = useState('')
  const [alarmUrl, setAlarmUrl] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setServiceId('')
    setServiceName('')
    setIp('')
    setPort('')
    setHeartBeatMode('url')
    setCheckUrl('')
    setAlarmUrl('')
    setError(null)
  }, [open])

  const mutation = useMutation({
    mutationFn: (svc: Parameters<typeof addService>[0]) => addService(svc),
    onSuccess: () => {
      toast.success(servicesStr.toasts.added(serviceName.trim() || serviceId.trim()))
      void queryClient.invalidateQueries({ queryKey: ['services'] })
      onCreated?.()
      onClose() // 保存成功直接关闭（绕过脏守卫）
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : servicesStr.toasts.failed),
  })

  const isDirty =
    serviceId.trim() !== '' ||
    serviceName.trim() !== '' ||
    ip.trim() !== '' ||
    port.trim() !== '' ||
    checkUrl.trim() !== '' ||
    alarmUrl.trim() !== '' ||
    heartBeatMode !== 'url'
  const { requestClose, guardNode } = useDirtyGuard(onClose, isDirty)

  const submit = () => {
    const sid = serviceId.trim()
    const name = serviceName.trim()
    if (!sid) {
      setError(servicesStr.errors.serviceIdRequired)
      return
    }
    if (!name) {
      setError(servicesStr.errors.serviceNameRequired)
      return
    }
    const portStr = port.trim()
    let portNum: number | undefined
    if (portStr) {
      const n = Number(portStr)
      if (!Number.isInteger(n) || n < 1 || n > 65535) {
        setError(servicesStr.errors.portInvalid)
        return
      }
      portNum = n
    }
    mutation.mutate({
      serviceId: sid,
      serviceName: name,
      heartBeatMode,
      ip: ip.trim() || undefined,
      port: portNum,
      checkUrl: checkUrl.trim() || undefined,
      alarmUrl: alarmUrl.trim() || undefined,
    })
  }

  const selectCls =
    'h-8 w-full rounded-md border border-border bg-input px-2 text-xs text-foreground outline-none focus-visible:border-primary'

  return (
    <Modal open={open} title={servicesStr.dialog.title} onClose={requestClose} width="max-w-lg">
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="svc-id">{servicesStr.dialog.serviceId}</Label>
            <Input
              id="svc-id"
              autoFocus
              className="font-mono"
              placeholder={servicesStr.dialog.serviceIdPlaceholder}
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="svc-name">{servicesStr.dialog.serviceName}</Label>
            <Input
              id="svc-name"
              placeholder={servicesStr.dialog.serviceNamePlaceholder}
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="svc-ip">{servicesStr.dialog.ip}</Label>
            <Input
              id="svc-ip"
              className="font-mono"
              placeholder={servicesStr.dialog.ipPlaceholder}
              value={ip}
              onChange={(e) => setIp(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="svc-port">{servicesStr.dialog.port}</Label>
            <Input
              id="svc-port"
              type="number"
              min={1}
              max={65535}
              className="font-mono"
              placeholder={servicesStr.dialog.portPlaceholder}
              value={port}
              onChange={(e) => setPort(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="svc-heartbeat">{servicesStr.dialog.heartBeatMode}</Label>
          <select
            id="svc-heartbeat"
            value={heartBeatMode}
            onChange={(e) => setHeartBeatMode(e.target.value)}
            className={selectCls}
          >
            <option value="url">{servicesStr.heartBeat.url}</option>
            <option value="tcp">{servicesStr.heartBeat.tcp}</option>
          </select>
          <p className="text-[11px] text-muted-foreground">
            {servicesStr.dialog.heartBeatModeHint}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="svc-check-url">{servicesStr.dialog.checkUrl}</Label>
          <Input
            id="svc-check-url"
            className="font-mono"
            placeholder={servicesStr.dialog.checkUrlPlaceholder}
            value={checkUrl}
            onChange={(e) => setCheckUrl(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="svc-alarm-url">{servicesStr.dialog.alarmUrl}</Label>
          <Input
            id="svc-alarm-url"
            className="font-mono"
            placeholder={servicesStr.dialog.alarmUrlPlaceholder}
            value={alarmUrl}
            onChange={(e) => setAlarmUrl(e.target.value)}
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
            {mutation.isPending ? servicesStr.dialog.submitting : servicesStr.dialog.submit}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
