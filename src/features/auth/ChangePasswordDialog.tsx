import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { changePassword } from '../../api/auth'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Modal } from '../../components/ui/modal'
import { Spinner } from '../../components/ui/spinner'
import { ApiError } from '../../lib/http'
import { toast } from '../../stores/toast'
import { accessStr } from '../../strings/access'

/** 修改自己的密码（Admin/ChangePassword） */
export function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setOldPwd('')
    setNewPwd('')
    setConfirmPwd('')
    setError(null)
  }

  const mutation = useMutation({
    mutationFn: () => changePassword(oldPwd, newPwd),
    onSuccess: () => {
      toast.success(accessStr.changePassword.toasts.saved)
      reset()
      onClose()
    },
    onError: (e) =>
      setError(e instanceof ApiError ? e.message : accessStr.changePassword.toasts.failed),
  })

  const validate = (): string | null => {
    if (!oldPwd) return accessStr.changePassword.errors.oldRequired
    if (newPwd.length < 6) return accessStr.changePassword.errors.newMin
    if (newPwd !== confirmPwd) return accessStr.changePassword.errors.mismatch
    return null
  }

  const submit = () => {
    const v = validate()
    if (v) {
      setError(v)
      return
    }
    mutation.mutate()
  }

  return (
    <Modal open={open} onClose={onClose} title={accessStr.changePassword.title} width="max-w-sm">
      <div className="flex flex-col gap-4">
        {error && (
          <div
            role="alert"
            className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger"
          >
            {error}
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cp-old">{accessStr.changePassword.old}</Label>
          <Input
            id="cp-old"
            type="password"
            autoFocus
            value={oldPwd}
            onChange={(e) => setOldPwd(e.target.value)}
            placeholder={accessStr.changePassword.oldPlaceholder}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cp-new">{accessStr.changePassword.new}</Label>
          <Input
            id="cp-new"
            type="password"
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
            placeholder={accessStr.changePassword.newPlaceholder}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cp-confirm">{accessStr.changePassword.confirm}</Label>
          <Input
            id="cp-confirm"
            type="password"
            value={confirmPwd}
            onChange={(e) => setConfirmPwd(e.target.value)}
            placeholder={accessStr.changePassword.confirmPlaceholder}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            取消
          </Button>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending && <Spinner />}
            {mutation.isPending
              ? accessStr.changePassword.submitting
              : accessStr.changePassword.submit}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
