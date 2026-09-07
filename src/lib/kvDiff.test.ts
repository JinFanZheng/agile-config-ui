import { describe, expect, it } from 'vitest'
import { diffKv, diffKvVsMap, parseKv } from './kvDiff'

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

describe('diffKvVsMap', () => {
  const online = new Map([
    ['app:timeout', '30'],
    ['app:retry', '3'],
    ['db:conn', 'localhost'],
    ['legacy:key', 'old'],
  ])

  it('编辑器内容 vs 线上快照：新增+修改+删除', () => {
    const d = diffKvVsMap('app:timeout=60\napp:new=true', online)
    expect(d.counts).toEqual({ added: 1, changed: 1, removed: 3 })
    expect(d.rows).toEqual([
      { key: 'app:new', kind: 'added', new: 'true' },
      { key: 'app:retry', kind: 'removed', old: '3' },
      { key: 'app:timeout', kind: 'changed', old: '30', new: '60' },
      { key: 'db:conn', kind: 'removed', old: 'localhost' },
      { key: 'legacy:key', kind: 'removed', old: 'old' },
    ])
  })

  it('完全一致 → 空 diff', () => {
    const d = diffKvVsMap('app:timeout=30\napp:retry=3\ndb:conn=localhost\nlegacy:key=old', online)
    expect(d.rows).toEqual([])
  })

  it('编辑器为空 → 全部标 removed', () => {
    const d = diffKvVsMap('', online)
    expect(d.counts.removed).toBe(4)
  })
})
