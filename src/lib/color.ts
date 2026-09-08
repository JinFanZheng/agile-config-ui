/**
 * 颜色工具（纯函数，无重依赖，可单测）。
 */
/**
 * 3 位 hex 展开（#fff → #ffffff）。monaco 会把 editor.foreground/background 降级为 token 规则，
 * 其校验只认 6 位 hex（tokenization.js colorRegExp）；生产构建 lightningcss 把 #ffffff 压缩成 #fff，
 * 不展开则 defineTheme 直接抛错、整页被 ErrorBoundary 打崩（真实部署实测，dev 不压缩故 CI 盲区）。
 */
export function expandHex6(color: string): string {
  const s = color.trim()
  return /^#[0-9a-f]{3}$/i.test(s) ? `#${[...s.slice(1)].map((c) => c + c).join('')}` : s
}
