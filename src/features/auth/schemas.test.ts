import { describe, expect, it } from 'vitest'
import { initPasswordSchema, loginSchema } from './schemas'

describe('loginSchema', () => {
  it('通过：用户名与密码均非空', () => {
    expect(loginSchema.safeParse({ userName: 'admin', password: 'pass-123456' }).success).toBe(true)
  })
  it('拒绝：用户名为空', () => {
    const r = loginSchema.safeParse({ userName: '', password: 'x' })
    expect(r.success).toBe(false)
  })
  it('拒绝：密码为空', () => {
    const r = loginSchema.safeParse({ userName: 'admin', password: '' })
    expect(r.success).toBe(false)
  })
})

describe('initPasswordSchema', () => {
  it('通过：两次一致且 ≥6 位', () => {
    const r = initPasswordSchema.safeParse({ password: 'pass-123456', confirmPassword: 'pass-123456' })
    expect(r.success).toBe(true)
  })
  it('拒绝：密码过短', () => {
    const r = initPasswordSchema.safeParse({ password: '123', confirmPassword: '123' })
    expect(r.success).toBe(false)
  })
  it('拒绝：两次输入不一致（错误定位在 confirmPassword）', () => {
    const r = initPasswordSchema.safeParse({ password: 'pass-123456', confirmPassword: 'different' })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues[0].path).toContain('confirmPassword')
      expect(r.error.issues[0].message).toBe('两次输入的密码不一致')
    }
  })
})
