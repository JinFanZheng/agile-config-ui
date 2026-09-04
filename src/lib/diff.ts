/**
 * Diff 组装纯函数（无专用后端端点，前端组合，handoff §5.4）：
 * - buildPendingDiff：待发布改动 vs 最新线上快照（发布预览数据源）
 * - buildVersionDiff：两个历史版本快照对比（版本 diff 数据源）
 * 语义（源码+实测定案，handoff §5.4 已修正）：EditStatus Add=0/Edit=1/Deleted=2/Commit=10；
 * 编辑已上线项会把 onlineStatus 重置为 0，故判定一律以 editStatus 为准。
 */

export type DiffKind = 'added' | 'changed' | 'removed'

export interface DiffRow {
  group: string
  key: string
  kind: DiffKind
  /** 修改/删除方向存在旧值 */
  old?: string
  /** 新增/修改存在新值 */
  new?: string
}

const kk = (group: string, key: string) => `${group}\u0000${key}`

interface SnapshotLike {
  group: string
  key: string
  value: string
}

export function sortDiff(rows: DiffRow[]): DiffRow[] {
  const order: Record<DiffKind, number> = { added: 0, changed: 1, removed: 2 }
  return [...rows].sort(
    (a, b) => a.group.localeCompare(b.group) || a.key.localeCompare(b.key) || order[a.kind] - order[b.kind]
  )
}

interface PendingLike extends SnapshotLike {
  onlineStatus: number
  editStatus: number
}

/** 待发布 diff：rows=当前 Search 全量；onlineSnapshot=最新发布版本快照（无发布史则传 []） */
export function buildPendingDiff(rows: PendingLike[], onlineSnapshot: SnapshotLike[]): DiffRow[] {
  const online = new Map(onlineSnapshot.map((c) => [kk(c.group, c.key), c.value]))
  const out: DiffRow[] = []
  for (const r of rows) {
    const id = kk(r.group, r.key)
    if (r.editStatus === 2) {
      // 删除方向：旧值来自线上快照
      const old = online.get(id)
      if (old !== undefined) out.push({ group: r.group, key: r.key, kind: 'removed', old })
      continue
    }
    if (r.editStatus === 0) {
      out.push({ group: r.group, key: r.key, kind: 'added', new: r.value })
      continue
    }
    if (r.editStatus === 1) {
      const old = online.get(id)
      if (old !== r.value) out.push({ group: r.group, key: r.key, kind: 'changed', old, new: r.value })
    }
  }
  return sortDiff(out)
}

/** 版本 diff：older → newer（新增=仅 newer 有；删除=仅 older 有；修改=值不同） */
export function buildVersionDiff(older: SnapshotLike[], newer: SnapshotLike[]): DiffRow[] {
  const a = new Map(older.map((c) => [kk(c.group, c.key), c.value]))
  const b = new Map(newer.map((c) => [kk(c.group, c.key), c.value]))
  const out: DiffRow[] = []
  for (const c of newer) {
    const id = kk(c.group, c.key)
    if (!a.has(id)) out.push({ group: c.group, key: c.key, kind: 'added', new: c.value })
    else if (a.get(id) !== c.value)
      out.push({ group: c.group, key: c.key, kind: 'changed', old: a.get(id), new: c.value })
  }
  for (const c of older) {
    if (!b.has(kk(c.group, c.key))) out.push({ group: c.group, key: c.key, kind: 'removed', old: c.value })
  }
  return sortDiff(out)
}
