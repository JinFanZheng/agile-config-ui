import { useEffect, useState } from 'react'

/**
 * 媒体查询响应钩子（SSR/测试环境 matchMedia 缺失时安全返回 false）。
 * 典型用途：窄屏 <768px 时 DiffEditor 切 inline 单栏（移动端适配，ITER-17）。
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    try {
      return !!window.matchMedia(query).matches
    } catch {
      return false
    }
  })

  useEffect(() => {
    let mq: MediaQueryList
    try {
      mq = window.matchMedia(query)
    } catch {
      return
    }
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches)
    setMatches(mq.matches)
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [query])

  return matches
}
