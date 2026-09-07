import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Tooltip } from './tooltip'

describe('Tooltip', () => {
  afterEach(() => {
    cleanup()
  })

  it('悬停显示内容，移开隐藏', async () => {
    render(
      <Tooltip content="提示文本">
        <button type="button">触发</button>
      </Tooltip>
    )
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

    fireEvent.mouseEnter(screen.getByRole('button'))
    await waitFor(
      () => expect(screen.getByRole('tooltip')).toHaveTextContent('提示文本'),
      { timeout: 1000 }
    )

    fireEvent.mouseLeave(screen.getByRole('button'))
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('聚焦显示（键盘可达），失焦隐藏', async () => {
    render(
      <Tooltip content="键盘提示">
        <button type="button">触发</button>
      </Tooltip>
    )
    fireEvent.focus(screen.getByRole('button'))
    await waitFor(() => expect(screen.getByRole('tooltip')).toHaveTextContent('键盘提示'), {
      timeout: 1000,
    })
    fireEvent.blur(screen.getByRole('button'))
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })
})
