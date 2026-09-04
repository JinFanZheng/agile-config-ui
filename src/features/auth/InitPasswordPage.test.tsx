import { cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { initPassword } from '../../api/auth'
import { renderWithProviders } from '../../test/test-utils'
import { InitPasswordPage } from './InitPasswordPage'

vi.mock('../../api/auth', () => ({
  initPassword: vi.fn(),
}))

const initPasswordMock = vi.mocked(initPassword)

describe('InitPasswordPage', () => {
  beforeEach(() => {
    initPasswordMock.mockReset()
  })
  afterEach(cleanup)

  it('两次密码不一致时前端拦截，不发起请求', async () => {
    const { getByRole, getByLabelText, findByText } = renderWithProviders(<InitPasswordPage />)
    await userEvent.type(getByLabelText('密码'), 'ss123456')
    await userEvent.type(getByLabelText('确认密码'), 'different')
    await userEvent.click(getByRole('button', { name: '初始化' }))

    expect(await findByText('两次输入的密码不一致')).toBeInTheDocument()
    expect(initPasswordMock).not.toHaveBeenCalled()
  })

  it('提交成功后显示成功文案并调用正确参数', async () => {
    initPasswordMock.mockResolvedValue(undefined)
    const { getByRole, getByLabelText, findByText } = renderWithProviders(<InitPasswordPage />)
    await userEvent.type(getByLabelText('密码'), 'ss123456')
    await userEvent.type(getByLabelText('确认密码'), 'ss123456')
    await userEvent.click(getByRole('button', { name: '初始化' }))

    expect(await findByText('初始化成功，即将前往登录…')).toBeInTheDocument()
    expect(initPasswordMock).toHaveBeenCalledWith('ss123456', 'ss123456')
  })
})
