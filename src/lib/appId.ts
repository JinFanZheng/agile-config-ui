/**
 * 应用 ID 生成器（UX #6：服务端要求 id 必填且不代生成，旧 UI 让用户手填是要修掉的糟点）。
 * 格式：app-<8 位小写字母数字>，可读且撞库概率 ~36^8 ≈ 2.8e12。
 */
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'

export function generateAppId(): string {
  const buf = new Uint32Array(8)
  crypto.getRandomValues(buf)
  const suffix = Array.from(buf, (n) => ALPHABET[n % ALPHABET.length]).join('')
  return `app-${suffix}`
}

/** 应用 id 合法性（服务端用于路径/查询参数，保守限制字符集） */
export function isValidAppId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{1,64}$/.test(id)
}
