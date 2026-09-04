import { describe, expect, it } from 'vitest'
import { generateAppId, isValidAppId } from './appId'

describe('generateAppId', () => {
  it('格式：app- 前缀 + 8 位小写字母数字', () => {
    const id = generateAppId()
    expect(id).toMatch(/^app-[a-z0-9]{8}$/)
  })

  it('通过自身校验器', () => {
    expect(isValidAppId(generateAppId())).toBe(true)
  })

  it('连续生成不重复（撞库概率检验，1e4 次）', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 10_000; i++) seen.add(generateAppId())
    expect(seen.size).toBe(10_000)
  })
})

describe('isValidAppId', () => {
  it.each(['demo_app', 'app-x1y2', 'MyApp_99', 'a'.repeat(64)])('接受 %s', (v) => {
    expect(isValidAppId(v)).toBe(true)
  })
  it.each(['', 'has space', '中文id', 'a'.repeat(65), 'bad/slash'])('拒绝 %s', (v) => {
    expect(isValidAppId(v)).toBe(false)
  })
})
