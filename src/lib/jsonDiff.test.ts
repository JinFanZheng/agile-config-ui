import { describe, expect, it } from 'vitest'
import { buildOnlineJsonText, diffJsonCounts, parseJsoncToEntries } from './jsonDiff'

describe('parseJsoncToEntries', () => {
  it('分组嵌套结构扁平化为 group:key', () => {
    const text = '{\n  "app": {\n    "timeout": "45"\n  },\n  "db": {\n    "conn": "c1"\n  }\n}'
    expect(parseJsoncToEntries(text)).toEqual([
      ['app:timeout', '45'],
      ['db:conn', 'c1'],
    ])
  })

  it('顶层原始值=空分组键', () => {
    expect(parseJsoncToEntries('{"plain":"x","g":{"k":"v"}}')).toEqual([
      ['plain', 'x'],
      ['g:k', 'v'],
    ])
  })

  it('容忍 // 与块注释', () => {
    const text = `{
  // 描述注释
  "app": { /* 块注释 */ "k": "v" }
}`
    expect(parseJsoncToEntries(text)).toEqual([['app:k', 'v']])
  })

  it('注释符号出现在字符串内不受影响', () => {
    expect(parseJsoncToEntries('{"url":"http://x/*y*/"}')).toEqual([['url', 'http://x/*y*/']])
  })

  it('多级冒号逐级嵌套扁平化（含整数供应商 ID 键保序，实测格式通用化）', () => {
    const text = JSON.stringify(
      {
        CachePolicy: {
          MaxItemsPerBatch: '10',
          Vendors: { '1200': { AllowProbe: 'False' } },
        },
      },
      null,
      2
    )
    expect(parseJsoncToEntries(text)).toEqual([
      ['CachePolicy:MaxItemsPerBatch', '10'],
      ['CachePolicy:Vendors:1200:AllowProbe', 'False'],
    ])
  })

  it('数组按服务端语义展开为索引键', () => {
    expect(parseJsoncToEntries('{"hosts":["a","b"]}')).toEqual([
      ['hosts:0', 'a'],
      ['hosts:1', 'b'],
    ])
    expect(
      parseJsoncToEntries('{"r":[{"Action":"P"},{"Action":"Q"}]}')
    ).toEqual([
      ['r:0:Action', 'P'],
      ['r:1:Action', 'Q'],
    ])
  })

  it('整数键保持文档顺序（JSON.parse 会把 1200/198 重排，这里必须保序）', () => {
    const text = '{"g":{"1200":{"k":"a"},"198":{"k":"b"}}}'
    expect(parseJsoncToEntries(text)).toEqual([
      ['g:1200:k', 'a'],
      ['g:198:k', 'b'],
    ])
  })

  it('字面量按服务端规则归一化：true→True、null→""、数字→文本', () => {
    expect(parseJsoncToEntries('{"a":true,"b":false,"c":null,"d":42}')).toEqual([
      ['a', 'True'],
      ['b', 'False'],
      ['c', ''],
      ['d', '42'],
    ])
  })

  it('非法 JSON 返回 null', () => {
    expect(parseJsoncToEntries('{"a": ')).toBeNull()
    expect(parseJsoncToEntries('[1,2]')).toBeNull()
  })
})

describe('diffJsonCounts', () => {
  const online = new Map([
    ['app:a', '1'],
    ['app:b', '2'],
    ['db:c', '3'],
  ])

  it('新增/修改/删除计数', () => {
    const cur: [string, string][] = [
      ['app:a', '1'], // 不变
      ['app:b', '9'], // 修改
      ['db:new', 'x'], // 新增
    ]
    expect(diffJsonCounts(cur, online, true)).toEqual({ added: 1, changed: 1, removed: 1 })
  })

  it('fullMode=false 不计 removed（补丁模式语义）', () => {
    const cur: [string, string][] = [['app:a', '1']]
    expect(diffJsonCounts(cur, online, false)).toEqual({ added: 0, changed: 0, removed: 0 })
  })
})

describe('buildOnlineJsonText', () => {
  it('按编辑器键序排列，编辑器缺失的键追加在分组末尾', () => {
    const online = new Map([
      ['db:conn', 'c'], // 编辑器里 db 在前
      ['app:z', 'zz'], // 编辑器里排第二
      ['app:a', 'aa'], // 编辑器里没有 → 追加
    ])
    const text = buildOnlineJsonText(online, ['db:conn', 'app:z'])
    const parsed = JSON.parse(text) as Record<string, Record<string, string>>
    expect(Object.keys(parsed)).toEqual(['db', 'app'])
    expect(Object.keys(parsed.db)).toEqual(['conn'])
    expect(Object.keys(parsed.app)).toEqual(['z', 'a'])
  })

  it('按冒号逐级嵌套重建（多级键不再平铺成字面量键名）', () => {
    const online = new Map([
      ['CachePolicy:MaxItemsPerBatch', '10'],
      ['CachePolicy:Vendors:1200:AllowProbe', 'False'],
    ])
    const text = buildOnlineJsonText(online, [])
    expect(JSON.parse(text)).toEqual({
      CachePolicy: {
        MaxItemsPerBatch: '10',
        Vendors: { '1200': { AllowProbe: 'False' } },
      },
    })
  })

  it('连续 0 起始整数键还原为数组（数字升序）', () => {
    const online = new Map([
      ['r:1:Action', 'Q'],
      ['r:0:Action', 'P'],
      ['r:2:Action', 'R'],
    ])
    const text = buildOnlineJsonText(online, [])
    expect(JSON.parse(text)).toEqual({ r: [{ Action: 'P' }, { Action: 'Q' }, { Action: 'R' }] })
    expect(text).toContain('"r": [')
  })

  it('非 0 起始的整数键保持对象形式（如供应商 ID 1200/198）', () => {
    const online = new Map([
      ['g:Vendors:1200:k', 'a'],
      ['g:Vendors:198:k', 'b'],
    ])
    const text = buildOnlineJsonText(online, ['g:Vendors:1200:k', 'g:Vendors:198:k'])
    expect(JSON.parse(text)).toEqual({
      g: { Vendors: { '1200': { k: 'a' }, '198': { k: 'b' } } },
    })
    expect(text.indexOf('1200')).toBeLessThan(text.indexOf('198'))
  })

  it('空分组键放顶层', () => {
    const online = new Map([
      ['plain', 'x'],
      ['g:k', 'v'],
    ])
    const text = buildOnlineJsonText(online, [])
    const parsed = JSON.parse(text) as Record<string, unknown>
    expect(parsed.plain).toBe('x')
    expect((parsed.g as Record<string, string>).k).toBe('v')
  })

  it('值做 JSON 转义与 2 空格缩进', () => {
    const text = buildOnlineJsonText(new Map([['a:q', 'he said "hi"\n']]), [])
    expect(text).toBe('{\n  "a": {\n    "q": "he said \\"hi\\"\\n"\n  }\n}')
  })
})
