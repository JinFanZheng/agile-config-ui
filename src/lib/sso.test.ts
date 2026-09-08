import { describe, expect, it } from 'vitest'
import { parseOidcCallback } from './sso'

/** ITER-25：后端回调约定 `/ui#/oidc/login?code=` 的 hash 解析 */
describe('parseOidcCallback', () => {
  it('标准回调：返回 code', () => {
    expect(parseOidcCallback('#/oidc/login?code=abc123')).toBe('abc123')
  })

  it('带多参数 / 特殊字符', () => {
    expect(parseOidcCallback('#/oidc/login?state=x&code=a.b_c%2Fd')).toBe('a.b_c/d')
    expect(parseOidcCallback('#/oidc/login?code=first&state=1')).toBe('first')
  })

  it('无 code / 空 code / 其他 hash → null', () => {
    expect(parseOidcCallback('#/oidc/login?state=only')).toBeNull()
    expect(parseOidcCallback('#/oidc/login?code=')).toBeNull()
    expect(parseOidcCallback('#/apps')).toBeNull()
    expect(parseOidcCallback('')).toBeNull()
  })
})
