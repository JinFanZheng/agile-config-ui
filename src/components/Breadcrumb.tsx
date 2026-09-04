import { Link } from 'react-router'
import { cn } from '../lib/utils'

export interface BreadcrumbItem {
  label: string
  /** 有 to 的段可点击跳转；最后一段（当前页）应不可点 */
  to?: string
  /** AppId 等“代码性质文本”用等宽字体（交互规范 §8） */
  mono?: boolean
}

/**
 * 面包屑（交互规范）：≥2 级页面显示，一级导航页不显示；
 * 祖先段可点（muted → hover 前景色），当前段不可点。
 * asHeading=true 时当前段渲染为 h1（页面标题语义；勿在外层再包标题，aria-label 会覆盖命名）。
 */
export function Breadcrumb({
  items,
  label = '面包屑',
  asHeading = false,
}: {
  items: BreadcrumbItem[]
  label?: string
  asHeading?: boolean
}) {
  return (
    <nav aria-label={label} className="flex min-w-0 items-center gap-1.5 text-xs">
      {items.map((it, i) => {
        const isLast = i === items.length - 1
        return (
          <span key={i} className="flex min-w-0 items-center gap-1.5">
            {i > 0 && <span className="text-muted-foreground/50">/</span>}
            {it.to && !isLast ? (
              <Link
                to={it.to}
                className={cn(
                  'truncate text-muted-foreground transition-colors duration-150 hover:text-foreground hover:underline',
                  it.mono && 'font-mono'
                )}
              >
                {it.label}
              </Link>
            ) : asHeading && isLast ? (
              <h1
                className={cn(
                  'min-w-0 truncate text-sm font-semibold text-foreground',
                  it.mono && 'font-mono'
                )}
              >
                {it.label}
              </h1>
            ) : (
              <span className={cn('truncate font-medium text-foreground', it.mono && 'font-mono')}>
                {it.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
