import { useState } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog'

/**
 * 脏表单保护（交互规范）：表单弹窗有未保存修改时，
 * Esc / 遮罩 / X / 取消 一律先弹“放弃修改？”确认，防止误关丢数据。
 * 保存成功的关闭直接调用原始 onClose（绕过守卫）。
 */
export function useDirtyGuard(onClose: () => void, isDirty: boolean) {
  const [ask, setAsk] = useState(false)

  const requestClose = () => {
    if (isDirty) setAsk(true)
    else onClose()
  }

  const guardNode = (
    <ConfirmDialog
      open={ask}
      danger
      title="放弃未保存的修改？"
      body="当前表单已修改，关闭后将丢失这些改动。"
      confirmText="放弃修改"
      onCancel={() => setAsk(false)}
      onConfirm={() => {
        setAsk(false)
        onClose()
      }}
    />
  )

  return { requestClose, guardNode }
}
