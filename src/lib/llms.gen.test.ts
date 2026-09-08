import { mkdirSync, writeFileSync } from 'node:fs'
import { it } from 'vitest'
import { buildLlmsFull, buildLlmsIndex } from './llms'

/**
 * llms.txt 生成器入口（ITER-18）：pnpm gen:llms（= GEN_LLMS=1 vitest run 本文件）时写入
 * public/llms.txt / public/llms-full.txt；普通 pnpm test 时本用例跳过，零副作用。
 * 走 vitest 的 TS 解析（与 llms.test.ts 同通道）；内容一致性由 llms.test.ts 锁定。
 */
const generate = process.env.GEN_LLMS ? it : it.skip

generate('写入 public/llms.txt 与 public/llms-full.txt', () => {
  mkdirSync('public', { recursive: true })
  writeFileSync('public/llms.txt', buildLlmsIndex())
  writeFileSync('public/llms-full.txt', buildLlmsFull())
})
