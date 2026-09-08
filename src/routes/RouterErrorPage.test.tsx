import { cleanup, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { S } from '../strings/common'
import { RouterErrorPage } from './RouterErrorPage'

function Thrower({ message }: { message: string }): never {
  throw new Error(message)
}

/** errorElement 是数据路由器特性：与生产一致用 createMemoryRouter 驱动 */
function renderWithError(message: string) {
  const router = createMemoryRouter(
    [{ path: '/boom', element: <Thrower message={message} />, errorElement: <RouterErrorPage /> }],
    { initialEntries: ['/boom'] }
  )
  return render(<RouterProvider router={router} />)
}

afterEach(cleanup)

describe('RouterErrorPage', () => {
  it('过期 chunk：显示「应用已更新」并写入防循环标记（10s 内二次进入不重复触发）', () => {
    sessionStorage.clear()
    renderWithError('Failed to fetch dynamically imported module: http://x/KvView-1.js')
    expect(screen.getByText(S.routeError.updatedTitle)).toBeInTheDocument()
    const first = sessionStorage.getItem('agile-config-ui.chunk-reloaded-at')
    expect(first).not.toBeNull()

    cleanup()
    renderWithError('Importing a module script failed.')
    expect(screen.getByText(S.routeError.updatedTitle)).toBeInTheDocument()
    // 防抖窗口内时间戳不被改写（即不会再次自动刷新）
    expect(sessionStorage.getItem('agile-config-ui.chunk-reloaded-at')).toBe(first)
    sessionStorage.clear()
  })

  it('意外错误：中文兜底文案 + 刷新/返回按钮', () => {
    sessionStorage.clear()
    renderWithError('boom')
    expect(screen.getByText(S.routeError.unexpectedTitle)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: S.routeError.reload })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: S.routeError.backHome })).toBeInTheDocument()
  })
})
