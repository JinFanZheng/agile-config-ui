import { describe, expect, it } from 'vitest'
import { buildPendingDiff, buildVersionDiff, type DiffRow } from './diff'

const snap = (group: string, key: string, value: string) => ({ group, key, value })

describe('buildPendingDiff', () => {
  it('新增（onlineStatus=0）：只有新值', () => {
    const rows = buildPendingDiff(
      [{ group: '', key: 'a', value: '1', onlineStatus: 0, editStatus: 0 }],
      []
    )
    expect(rows).toEqual([{ group: '', key: 'a', kind: 'added', new: '1' }] as DiffRow[])
  })

  it('修改（editStatus=2）：旧值来自线上快照', () => {
    const rows = buildPendingDiff(
      [{ group: 'g', key: 'a', value: '2', onlineStatus: 0, editStatus: 1 }],
      [snap('g', 'a', '1')]
    )
    expect(rows).toEqual([{ group: 'g', key: 'a', kind: 'changed', old: '1', new: '2' }])
  })

  it('删除方向（editStatus=3）：保留旧值、无新值', () => {
    const rows = buildPendingDiff(
      [{ group: 'g', key: 'a', value: '1', onlineStatus: 0, editStatus: 2 }],
      [snap('g', 'a', '1')]
    )
    expect(rows).toEqual([{ group: 'g', key: 'a', kind: 'removed', old: '1' }])
  })

  it('无改动的行不出现；editStatus=2 但值相同也不出现', () => {
    const rows = buildPendingDiff(
      [
        { group: '', key: 'same', value: '1', onlineStatus: 1, editStatus: 10 },
        { group: '', key: 'noop', value: '1', onlineStatus: 0, editStatus: 1 },
      ],
      [snap('', 'same', '1'), snap('', 'noop', '1')]
    )
    expect(rows).toEqual([])
  })

  it('从未发布（快照为空）：新增行没有旧值', () => {
    const rows = buildPendingDiff(
      [
        { group: '', key: 'a', value: '1', onlineStatus: 0, editStatus: 0 },
        { group: '', key: 'b', value: '2', onlineStatus: 0, editStatus: 0 },
      ],
      []
    )
    expect(rows.map((r) => r.kind)).toEqual(['added', 'added'])
    expect(rows.every((r) => r.old === undefined)).toBe(true)
  })

  it('已提交（editStatus=10）与未变更行不出现', () => {
    const rows = buildPendingDiff(
      [{ group: '', key: 'ok', value: '1', onlineStatus: 1, editStatus: 10 }],
      [snap('', 'ok', '1')]
    )
    expect(rows).toEqual([])
  })

  it('异常数据（修改但无快照）：按修改处理、旧值为空', () => {
    const rows = buildPendingDiff([{ group: '', key: 'a', value: '1', onlineStatus: 0, editStatus: 1 }], [])
    expect(rows).toEqual([{ group: '', key: 'a', kind: 'changed', old: undefined, new: '1' }])
  })

  it('分组同名 key 互不冲突（group+key 联合定位）', () => {
    const rows = buildVersionDiff([snap('g1', 'a', '1')], [snap('g2', 'a', '1'), snap('g1', 'a', '2')])
    expect(rows).toHaveLength(2)
    expect(rows.find((r) => r.group === 'g2')).toMatchObject({ kind: 'added' })
    expect(rows.find((r) => r.group === 'g1')).toMatchObject({ kind: 'changed' })
  })

  it('多行值含多行文本/特殊字符原样保留', () => {
    const v = 'line1\nline2=xx:1 // 注释'
    const rows = buildVersionDiff([snap('g', 'k', v)], [snap('g', 'k', v + '!')])
    expect(rows[0]).toMatchObject({ old: v, new: v + '!' })
  })
})

describe('buildVersionDiff', () => {
  it('新增/删除/修改混合', () => {
    const rows = buildVersionDiff(
      [snap('', 'a', '1'), snap('', 'b', '2'), snap('', 'c', '3')],
      [snap('', 'a', '9'), snap('', 'c', '3'), snap('', 'd', '4')]
    )
    expect(rows).toEqual([
      { group: '', key: 'a', kind: 'changed', old: '1', new: '9' },
      { group: '', key: 'b', kind: 'removed', old: '2' },
      { group: '', key: 'd', kind: 'added', new: '4' },
    ])
  })

  it('完全一致的两个版本 → 空 diff', () => {
    expect(buildVersionDiff([snap('g', 'a', '1')], [snap('g', 'a', '1')])).toEqual([])
  })

  it('空输入安全', () => {
    expect(buildVersionDiff([], [])).toEqual([])
    expect(buildVersionDiff([], [snap('', 'x', '1')])).toEqual([
      { group: '', key: 'x', kind: 'added', new: '1' },
    ])
  })

  it('排序：组名字典序、组内 key 字典序', () => {
    const rows = buildVersionDiff(
      [snap('b', 'z', '1'), snap('a', 'y', '1')],
      [snap('b', 'a', '2'), snap('a', 'b', '2')]
    )
    expect(rows.map((r) => `${r.group}:${r.key}`)).toEqual(['a:b', 'a:y', 'b:a', 'b:z'])
  })
})
