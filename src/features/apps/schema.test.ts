import { describe, expect, it } from 'vitest'
import { appInputSchema } from './schema'

const valid = {
  name: '订单服务',
  id: 'app-k3f9x2m1',
  group: '',
  enabled: true,
  inheritanced: false,
  inheritancedApps: [],
}

describe('appInputSchema', () => {
  it('通过：合法输入', () => {
    expect(appInputSchema.safeParse(valid).success).toBe(true)
  })
  it('拒绝：名称为空', () => {
    expect(appInputSchema.safeParse({ ...valid, name: '' }).success).toBe(false)
  })
  it('拒绝：id 含非法字符', () => {
    const r = appInputSchema.safeParse({ ...valid, id: 'app id!' })
    expect(r.success).toBe(false)
  })
  it('拒绝：id 为空', () => {
    expect(appInputSchema.safeParse({ ...valid, id: '' }).success).toBe(false)
  })
})
