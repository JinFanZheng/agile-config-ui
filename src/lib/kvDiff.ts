/**
 * KV 文本行级 diff（纯函数，可测）：
 * 解析 key=value 行文本，与已保存版本按 key 对比，产出 新增/修改/删除 三组。
 * 全量模式（isPatch=false）下，"删除"= 保存后会被标记待发布删除的键（安全预警的核心）。
 */

export interface KvDiffRow {
  key: string
  kind: 'added' | 'changed' | 'removed'
  old?: string
  new?: string
}

export interface KvDiff {
  rows: KvDiffRow[]
  counts: { added: number; changed: number; removed: number }
}

/** 解析 KV 文本为 Map（首个 = 分割；空行/注释行忽略） */
export function parseKv(text: string): Map<string, string> {
  const m = new Map<string, string>()
  for (const line of text.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#') || t.startsWith('//')) continue
    const eq = t.indexOf('=')
    if (eq < 0) continue
    m.set(t.slice(0, eq).trim(), t.slice(eq + 1).trim())
  }
  return m
}

/** 对比编辑器文本 vs 已保存文本；fullMode 时额外把"保存版有、编辑版没有"的键标为 removed */
export function diffKv(current: string, saved: string, fullMode: boolean): KvDiff {
  const cur = parseKv(current)
  const sav = parseKv(saved)
  const rows: KvDiffRow[] = []

  for (const [k, v] of cur) {
    if (!sav.has(k)) rows.push({ key: k, kind: 'added', new: v })
    else if (sav.get(k) !== v) rows.push({ key: k, kind: 'changed', old: sav.get(k), new: v })
  }
  if (fullMode) {
    for (const [k, v] of sav) {
      if (!cur.has(k)) rows.push({ key: k, kind: 'removed', old: v })
    }
  }

  rows.sort((a, b) => a.key.localeCompare(b.key))
  return {
    rows,
    counts: {
      added: rows.filter((r) => r.kind === 'added').length,
      changed: rows.filter((r) => r.kind === 'changed').length,
      removed: rows.filter((r) => r.kind === 'removed').length,
    },
  }
}
