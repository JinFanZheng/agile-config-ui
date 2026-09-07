/**
 * JSON 视图 diff 纯函数（与 lib/kvDiff.ts 同构的产品本体 diff）：
 * jsonc（含注释）→ 扁平有序条目 [group:key, value]（与线上快照 Map 同构），
 * 并按编辑器键序重建线上 JSON 文本，保证 DiffEditor 两侧行对齐、同步滚动有意义。
 */

export interface JsonDiffCounts {
  added: number
  changed: number
  removed: number
}

/** 去掉 // 与块注释（跳过字符串字面量内部） */
function stripJsoncComments(text: string): string {
  let out = ''
  let i = 0
  let inString = false
  while (i < text.length) {
    const c = text[i]
    const next = text[i + 1]
    if (inString) {
      out += c
      if (c === '\\') {
        out += next ?? ''
        i += 2
        continue
      }
      if (c === '"') inString = false
      i++
      continue
    }
    if (c === '"') {
      inString = true
      out += c
      i++
      continue
    }
    if (c === '/' && next === '/') {
      while (i < text.length && text[i] !== '\n') i++
      continue
    }
    if (c === '/' && next === '*') {
      i += 2
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++
      i += 2
      continue
    }
    out += c
    i++
  }
  return out
}

/**
 * 字面量归一化：服务端解析 JSON 时 true→"True"、false→"False"、null→""、数字→十进制文本。
 * （实测结论见 handoff：.NET Configuration Binder 大小写不敏感 + 服务端 JSON 解析器归一化）
 */
function normalizeValue(v: unknown): string {
  if (v === null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'boolean') return v ? 'True' : 'False'
  if (typeof v === 'number') return String(v)
  return JSON.stringify(v)
}

/**
 * jsonc → 有序扁平条目 [group:key, value]。
 * 结构约定与 GetJson 一致：顶层属性=分组对象，其内属性=配置键；顶层原始值=空分组键。
 * 解析失败（非法 JSON）返回 null。
 */
export function parseJsoncToEntries(text: string): [string, string][] | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(stripJsoncComments(text))
  } catch {
    return null
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null
  const entries: [string, string][] = []
  for (const [group, inner] of Object.entries(parsed)) {
    if (typeof inner === 'object' && inner !== null && !Array.isArray(inner)) {
      for (const [key, v] of Object.entries(inner)) {
        entries.push([`${group}:${key}`, normalizeValue(v)])
      }
    } else {
      entries.push([group, normalizeValue(inner)])
    }
  }
  return entries
}

/** 有序条目 vs 参照 Map 的计数；fullMode=true 时把"参照有、当前没有"的键计为 removed */
export function diffJsonCounts(
  current: [string, string][],
  other: Map<string, string>,
  fullMode: boolean
): JsonDiffCounts {
  const cur = new Map(current)
  let added = 0
  let changed = 0
  let removed = 0
  for (const [k, v] of cur) {
    if (!other.has(k)) added++
    else if (other.get(k) !== v) changed++
  }
  if (fullMode) {
    for (const k of other.keys()) {
      if (!cur.has(k)) removed++
    }
  }
  return { added, changed, removed }
}

/**
 * 按编辑器键序重建线上 JSON 文本（2 空格缩进，分组嵌套结构与 GetJson 一致）。
 * 编辑器里不存在的线上键（将删除）追加在对应分组末尾；分组顺序按首次出现排列。
 */
export function buildOnlineJsonText(onlineMap: Map<string, string>, editorOrder: string[]): string {
  const orderIdx = new Map(editorOrder.map((k, i) => [k, i]))
  const keys = [...onlineMap.keys()].sort((a, b) => {
    const ia = orderIdx.get(a)
    const ib = orderIdx.get(b)
    if (ia !== undefined && ib !== undefined) return ia - ib
    if (ia !== undefined) return -1
    if (ib !== undefined) return 1
    return a.localeCompare(b)
  })
  const root: Record<string, unknown> = {}
  const groups = new Map<string, Record<string, string>>()
  for (const flat of keys) {
    const colon = flat.indexOf(':')
    const group = colon < 0 ? '' : flat.slice(0, colon)
    const key = colon < 0 ? flat : flat.slice(colon + 1)
    if (!group) {
      root[key] = onlineMap.get(flat) ?? ''
    } else {
      let g = groups.get(group)
      if (!g) {
        g = {}
        groups.set(group, g)
        root[group] = g
      }
      g[key] = onlineMap.get(flat) ?? ''
    }
  }
  return JSON.stringify(root, null, 2)
}
