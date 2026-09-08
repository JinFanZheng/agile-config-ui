import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { SNIPPETS } from '../features/guide/snippets'
import { guideStr } from '../strings/guide'
import { buildLlmsFull, buildLlmsIndex } from './llms'

/**
 * ITER-18：llms.txt 与产品内接入指南同源不漂移。
 * 约定：改了指南文案/代码示例必须跑 `pnpm gen:llms` 重新生成（build 前置步骤已挂）。
 */

const COMMITTED_INDEX = readFileSync('public/llms.txt', 'utf8')
const COMMITTED_FULL = readFileSync('public/llms-full.txt', 'utf8')

describe('llms.txt 生成', () => {
  it('已提交文件与当前指南内容一致（漂移时跑 pnpm gen:llms）', () => {
    expect(COMMITTED_INDEX).toBe(buildLlmsIndex())
    expect(COMMITTED_FULL).toBe(buildLlmsFull())
  })

  it('索引含全量文档链接与快速事实', () => {
    expect(COMMITTED_INDEX).toContain('llms-full.txt')
    expect(COMMITTED_INDEX).toContain('a:b:c')
    expect(COMMITTED_INDEX).toContain('isPatch=false')
  })

  it('全量文档覆盖六节标题与全部代码示例（逐条比对源码字符串）', () => {
    for (const s of Object.values(guideStr.sections)) {
      expect(COMMITTED_FULL, s.id).toContain(`## ${s.label}`)
    }
    for (const [name, code] of Object.entries(SNIPPETS)) {
      expect(COMMITTED_FULL, name).toContain(code)
    }
    expect(COMMITTED_FULL).toContain('AddAgileConfig')
    expect(COMMITTED_FULL).toContain('IOptionsMonitor')
  })

  it('不含实例数据与凭证占位（只有统一占位符）', () => {
    for (const banned of ['localhost:5017', 'demo_app', 'E2E_ADMIN', 'password=']) {
      expect(COMMITTED_FULL, banned).not.toContain(banned)
      expect(COMMITTED_INDEX, banned).not.toContain(banned)
    }
    expect(COMMITTED_FULL).toContain('your-app-id')
  })
})
