import { describe, expect, it } from 'vitest'
import { ApiError, unwrapEnvelope, unwrapPage } from './http'

describe('unwrapEnvelope', () => {
  it('success:true 时返回 data', () => {
    expect(unwrapEnvelope({ success: true, data: 42 })).toBe(42)
  })

  it('success:false 时抛 ApiError 并保留服务端 message', () => {
    expect(() =>
      unwrapEnvelope({ success: false, message: '应用Id不能为空', data: null })
    ).toThrowError(ApiError)
    try {
      unwrapEnvelope({ success: false, message: '应用Id不能为空', data: null })
    } catch (e) {
      expect((e as ApiError).message).toBe('应用Id不能为空')
    }
  })

  it('success:false 且无 message 时使用兜底文案', () => {
    try {
      unwrapEnvelope({ success: false, data: null })
    } catch (e) {
      expect((e as ApiError).message).toBe('请求失败')
    }
  })
})

describe('unwrapPage', () => {
  it('分页响应 success:true 时原样返回（含 total 与 data）', () => {
    const page = { current: 1, pageSize: 20, total: 3, success: true, data: [{ id: 'a' }] }
    expect(unwrapPage(page)).toEqual(page)
  })

  it('分页响应 success:false 时抛 ApiError', () => {
    expect(() =>
      unwrapPage({
        current: 1,
        pageSize: 20,
        total: 0,
        success: false,
        message: '未授权',
        data: [],
      })
    ).toThrowError('未授权')
  })
})
