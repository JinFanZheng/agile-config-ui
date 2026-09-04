import { cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { login } from '../../api/auth'
import { ApiError } from '../../lib/http'
import { useAuthStore } from '../../stores/auth'
import { renderWithProviders } from '../../test/test-utils'
import { LoginPage } from './LoginPage'

vi.mock('../../api/auth', () => ({
  login: vi.fn(),
  checkPasswordInited: vi.fn().mockResolvedValue(true),
}))

const loginMock = vi.mocked(login)

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.getState().clear()
    loginMock.mockReset()
  })
  afterEach(cleanup)

  it('空表单提交显示校验错误，不发起请求', async () => {
    const { findByText, getByRole } = renderWithProviders(<LoginPage />)
    await userEvent.click(getByRole('button', { name: '登录' }))
    expect(await findByText('请输入用户名')).toBeInTheDocument()
    expect(loginMock).not.toHaveBeenCalled()
  })

  it('登录成功写入会话（token + 当前用户）', async () => {
    loginMock.mockResolvedValue({
      token: 'jwt-token',
      user: { userName: 'admin', roles: ['super_admin'], functions: ['Config_Add'] },
    })
    const { getByRole, getByLabelText } = renderWithProviders(<LoginPage />)
    await userEvent.type(getByLabelText('用户名'), 'admin')
    await userEvent.type(getByLabelText('密码'), 'ss123456')
    await userEvent.click(getByRole('button', { name: '登录' }))

    expect(loginMock).toHaveBeenCalledWith('admin', 'ss123456')
    const s = useAuthStore.getState()
    expect(s.token).toBe('jwt-token')
    expect(s.user?.userName).toBe('admin')
  })

  it('登录失败显示服务端错误信息', async () => {
    loginMock.mockRejectedValue(new ApiError('密码错误'))
    const { getByRole, getByLabelText, findByRole } = renderWithProviders(<LoginPage />)
    await userEvent.type(getByLabelText('用户名'), 'admin')
    await userEvent.type(getByLabelText('密码'), 'wrong')
    await userEvent.click(getByRole('button', { name: '登录' }))

    expect(await findByRole('alert')).toHaveTextContent('密码错误')
  })
})
