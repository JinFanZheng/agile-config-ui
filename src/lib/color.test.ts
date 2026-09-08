import { describe, expect, it } from 'vitest'
import { expandHex6 } from './color'

/** ITER-20（真实部署实测回归）：生产构建 lightningcss 压缩 #ffffff→#fff，monaco token 规则只认 6 位 */
describe('expandHex6', () => {
  it('3 位 hex 展开为 6 位（大小写）', () => {
    expect(expandHex6('#fff')).toBe('#ffffff')
    expect(expandHex6('#FFF')).toBe('#FFFFFF')
    expect(expandHex6('#0af')).toBe('#00aaff')
  })

  it('6 位 hex 与其他值原样返回（含前后空白修剪）', () => {
    expect(expandHex6('#ffffff')).toBe('#ffffff')
    expect(expandHex6('#71717a')).toBe('#71717a')
    expect(expandHex6(' #fff ')).toBe('#ffffff')
    expect(expandHex6('888888')).toBe('888888')
    expect(expandHex6('')).toBe('')
  })
})
