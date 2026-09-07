import { describe, expect, it } from 'vitest'
import { diffKv, parseKv } from './kvDiff'

describe('parseKv', () => {
  it('按首个 = 分割，保留值中的 =', () => {
    const m = parseKv('db:conn=server=a;b=c')
    expect(m.get('db:conn')).toBe('server=a;b=c')
  })
  it('忽略空行与注释行', () => {
    const m = parseKv('\n# 注释\n// 注释\na=1\n')
    expect(m.size).toBe(1)
    expect(m.get('a')).toBe('1')
  })
  it('无等号行跳过', () => {
    expect(parseKv('垃圾行\na=1').size).toBe(1)
  })
})

describe('diffKv', () => {
  const saved = 'a=1\nb=2\nc=3'

  it('补丁模式：只报新增与修改，不报删除', () => {
    const d = diffKv('a=9\nb=2\nc=3\nx=新', saved, false)
    expect(d.counts).toEqual({ added: 1, changed: 1, removed: 0 })
    expect(d.rows).toEqual([
      { key: 'a', kind: 'changed', old: '1', new: '9' },
      { key: 'x', kind: 'added', new: '新' },
    ])
  })

  it('全量模式：编辑版缺少的键标为 removed（删除预警）', () => {
    const d = diffKv('a=1', saved, true)
    expect(d.counts).toEqual({ added: 0, changed: 0, removed: 2 })
    expect(d.rows.map((r) => r.key)).toEqual(['b', 'c'])
  })

  it('完全一致 → 空 diff', () => {
    expect(diffKv(saved, saved, true).rows).toEqual([])
    expect(diffKv(saved, saved, false).rows).toEqual([])
  })

  it('值相同但格式微差（空格）不误报', () => {
    const d = diffKv('a = 1\nb=2\nc=3', saved, false)
    expect(d.rows).toEqual([])
  })
})
