import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { useDirtyGuard } from './useDirtyGuard'

function Harness({ isDirty }: { isDirty: boolean }) {
  const [closed, setClosed] = useState(false)
  const { requestClose, guardNode } = useDirtyGuard(() => setClosed(true), isDirty)
  return (
    <div>
      <button type="button" onClick={requestClose}>
        close
      </button>
      <span>{closed ? 'closed' : 'open'}</span>
      {guardNode}
    </div>
  )
}

describe('useDirtyGuard', () => {
  afterEach(cleanup)

  it('干净状态：直接关闭，不弹确认', async () => {
    render(<Harness isDirty={false} />)
    await userEvent.click(screen.getByRole('button', { name: 'close' }))
    expect(screen.getByText('closed')).toBeInTheDocument()
    expect(screen.queryByText('放弃未保存的修改？')).not.toBeInTheDocument()
  })

  it('脏状态：先弹放弃确认；取消则保持打开', async () => {
    render(<Harness isDirty />)
    await userEvent.click(screen.getByRole('button', { name: 'close' }))
    expect(screen.getByText('放弃未保存的修改？')).toBeInTheDocument()
    expect(screen.getByText('open')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(screen.queryByText('放弃未保存的修改？')).not.toBeInTheDocument()
    expect(screen.getByText('open')).toBeInTheDocument()
  })

  it('脏状态：确认放弃后真正关闭', async () => {
    render(<Harness isDirty />)
    await userEvent.click(screen.getByRole('button', { name: 'close' }))
    await userEvent.click(screen.getByRole('button', { name: '放弃修改' }))
    expect(screen.getByText('closed')).toBeInTheDocument()
  })
})
