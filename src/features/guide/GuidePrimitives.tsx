import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

/**
 * 接入指南文档原语（ITER-10）。
 * 全部为纯文本渲染：无 markdown/HTML 运行时，文案中的反引号片段仅做字符串分段后以 <code> 呈现。
 */

/** 反引号片段渲染为行内代码（纯文本分段，无任何 HTML/markdown 转换） */
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split('`').map((part, i) =>
        i % 2 === 1 ? (
          <code key={i} className="rounded-sm bg-elevated px-1 py-px font-mono text-xs">
            {part}
          </code>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

/** 正文段落 */
export function T({ text, muted = false }: { text: string; muted?: boolean }) {
  return (
    <p className={cn('text-[13px] leading-relaxed', muted && 'text-muted-foreground')}>
      <RichText text={text} />
    </p>
  )
}

/** 文档分节：锚点目标 + 标题（scroll-mt 供锚点跳转对齐留白） */
export function GuideSection({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: ReactNode
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-4">
      <h2 id={`${id}-title`} className="border-b border-border pb-2 text-sm font-semibold">
        {title}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  )
}

/** 小节标题 */
export function SubHeading({ children }: { children: ReactNode }) {
  return <h3 className="pt-2 text-[13px] font-semibold">{children}</h3>
}

/** 步骤条目（配合 <ol className="space-y-5"> 使用） */
export function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-[11px] font-medium">
        {n}
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <h3 className="text-[13px] font-semibold">{title}</h3>
        {children}
      </div>
    </li>
  )
}

/** 提示块（info=蓝 / warning=橙，语义色令牌） */
export function Note({ kind = 'info', children }: { kind?: 'info' | 'warning'; children: ReactNode }) {
  return (
    <div
      className={cn(
        'rounded-md border-l-2 px-3 py-2 leading-relaxed',
        kind === 'warning' ? 'border-l-warning bg-warning/5' : 'border-l-info bg-info/5'
      )}
    >
      {children}
    </div>
  )
}

/** 列表条目（文案含反引号行内代码） */
export function Bullets({ items }: { items: readonly string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5 text-[13px] leading-relaxed">
      {items.map((item, i) => (
        <li key={i}>
          <RichText text={item} />
        </li>
      ))}
    </ul>
  )
}

/** 两列说明表：首列默认等宽（monoAll=true 时两列都等宽），值列支持反引号行内代码 */
export function DefTable({
  head,
  rows,
  monoAll = false,
}: {
  head: readonly [string, string]
  rows: readonly (readonly [string, string])[]
  monoAll?: boolean
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-border bg-elevated">
            <th className="px-3 py-1.5 font-medium">{head[0]}</th>
            <th className="px-3 py-1.5 font-medium">{head[1]}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map(([k, v], i) => (
            <tr key={i}>
              <td className="px-3 py-1.5 align-top font-mono whitespace-nowrap">{k}</td>
              <td className={cn('px-3 py-1.5 align-top', monoAll && 'font-mono')}>
                <RichText text={v} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
