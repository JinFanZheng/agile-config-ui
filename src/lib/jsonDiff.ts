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
 * 保序扫描器：直接在文本上按文档顺序产出 [flatKey, value]。
 * 不用 JSON.parse——JS 对象的整数键（如 "1200"/"198"）会被强制数字升序，
 * 而服务端 GetJson 按配置顺序输出（1200 可在 198 前），丢序会让线上侧重建错位、diff 出噪音。
 * 数组按服务端语义展开为数字索引段（["a","b"] → arr:0 / arr:1）。非法 JSON 抛错。
 */
function scanEntries(src: string): [string, string][] {
  const out: [string, string][] = []
  let i = 0
  const n = src.length
  const ws = () => {
    while (i < n && /\s/.test(src[i])) i++
  }
  const scanString = (): string => {
    // src[i] === '"'
    const start = i
    i++
    while (i < n) {
      if (src[i] === '\\') {
        i += 2
        continue
      }
      if (src[i] === '"') {
        i++
        return JSON.parse(src.slice(start, i))
      }
      i++
    }
    throw new Error('unterminated string')
  }
  const scanValue = (path: string[]) => {
    ws()
    if (i >= n) throw new Error('unexpected end')
    const c = src[i]
    if (c === '"') {
      out.push([path.join(':'), scanString()])
      return
    }
    if (c === '{') {
      i++
      ws()
      if (src[i] === '}') {
        i++
        return
      }
      for (;;) {
        ws()
        if (src[i] !== '"') throw new Error('expect property name')
        const key = scanString()
        ws()
        if (src[i] !== ':') throw new Error('expect colon')
        i++
        scanValue([...path, key])
        ws()
        if (src[i] === ',') {
          i++
          continue
        }
        if (src[i] === '}') {
          i++
          return
        }
        throw new Error('expect , or }')
      }
    }
    if (c === '[') {
      i++
      ws()
      if (src[i] === ']') {
        i++
        return
      }
      let idx = 0
      for (;;) {
        scanValue([...path, String(idx++)])
        ws()
        if (src[i] === ',') {
          i++
          continue
        }
        if (src[i] === ']') {
          i++
          return
        }
        throw new Error('expect , or ]')
      }
    }
    // 字面量：true / false / null / number
    const m = /^(?:true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(src.slice(i))
    if (!m) throw new Error('unexpected token')
    i += m[0].length
    const v = m[0] === 'true' || m[0] === 'false' ? m[0] === 'true' : m[0] === 'null' ? null : Number(m[0])
    if (typeof v === 'number' && !Number.isFinite(v)) throw new Error('bad number')
    out.push([path.join(':'), normalizeValue(v)])
  }
  scanValue([])
  ws()
  if (i !== n) throw new Error('trailing content')
  return out
}

/**
 * jsonc → 有序扁平条目 [flatKey, value]。
 * 结构约定与 GetJson 一致：按冒号逐级嵌套（如 a:b:c → {a:{b:{c:v}}}），数组=数字索引段，顶层原始值=无冒号键。
 * 解析失败（非法 JSON）返回 null。
 */
export function parseJsoncToEntries(text: string): [string, string][] | null {
  try {
    const stripped = stripJsoncComments(text)
    if (!/^\s*\{/.test(stripped)) return null // 根必须是对象（分组结构）
    return scanEntries(stripped)
  } catch {
    return null
  }
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

type JsonTreeNode = Map<string, string | JsonTreeNode>

/** 全部键为整数且从 0 连续 → 视为数组（与服务端 SaveJson 的索引展开语义互逆；根节点除外） */
function isIndexArray(node: JsonTreeNode): boolean {
  if (node.size === 0) return false
  const idxs: number[] = []
  for (const k of node.keys()) {
    if (!/^\d+$/.test(k)) return false
    idxs.push(Number(k))
  }
  idxs.sort((a, b) => a - b)
  return idxs.every((v, i) => v === i)
}

/**
 * 手工序列化（2 空格缩进，格式对齐 JSON.stringify(root, null, 2)）：
 * 不能用 JSON.stringify——JS 对象的整数键（如供应商 ID "1200"）会被强制数字升序，
 * 而服务端按配置顺序输出（1200 可在 198 前），重排会造成 diff 噪音。
 */
function serializeTree(node: JsonTreeNode, depth: number, isRoot = false): string {
  const pad = '  '.repeat(depth)
  const inner = '  '.repeat(depth + 1)
  if (!isRoot && isIndexArray(node)) {
    const els = [...node.entries()]
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(
        ([, v]) =>
          `${inner}${typeof v === 'string' ? JSON.stringify(v) : serializeTree(v, depth + 1)}`
      )
    return `[\n${els.join(',\n')}\n${pad}]`
  }
  const lines = [...node.entries()].map(([k, v]) =>
    typeof v === 'string'
      ? `${inner}${JSON.stringify(k)}: ${JSON.stringify(v)}`
      : `${inner}${JSON.stringify(k)}: ${serializeTree(v, depth + 1)}`
  )
  return `{\n${lines.join(',\n')}\n${pad}}`
}

/**
 * 按编辑器键序重建线上 JSON 文本（2 空格缩进，按冒号逐级嵌套，与 GetJson 一致）。
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
  const root: JsonTreeNode = new Map()
  for (const flat of keys) {
    const segs = flat.split(':')
    let node = root
    for (let i = 0; i < segs.length - 1; i++) {
      let next = node.get(segs[i])
      if (!(next instanceof Map)) {
        next = new Map()
        node.set(segs[i], next)
      }
      node = next
    }
    node.set(segs[segs.length - 1], onlineMap.get(flat) ?? '')
  }
  return serializeTree(root, 0, true)
}
