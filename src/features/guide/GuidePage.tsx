import type { MouseEvent } from 'react'
import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'
import { guideStr } from '../../strings/guide'
import { CSharpSdkSection } from './sections/CSharpSdkSection'
import { DiIntegrationSection } from './sections/DiIntegrationSection'
import { FaqSection } from './sections/FaqSection'
import { PitfallsSection } from './sections/PitfallsSection'
import { QuickStartSection } from './sections/QuickStartSection'
import { ServiceRegisterSection } from './sections/ServiceRegisterSection'

const SECTIONS = [
  guideStr.sections.quickStart,
  guideStr.sections.csharpSdk,
  guideStr.sections.diIntegration,
  guideStr.sections.serviceRegister,
  guideStr.sections.pitfalls,
  guideStr.sections.faq,
]

type SectionId = (typeof SECTIONS)[number]['id']

/** 目录链接样式（与布局壳侧栏导航一致：选中=selected 令牌） */
function tocLinkClass(isActive: boolean, extra: string) {
  return cn(
    'rounded-md text-xs transition-colors duration-150 ease-out',
    isActive
      ? 'bg-selected font-medium text-selected-foreground'
      : 'text-muted-foreground hover:bg-hover hover:text-foreground',
    extra
  )
}

/**
 * 接入指南：面向接入方开发者的产品内文档页（ITER-10，网页直出 TSX）。
 * 锚点导航（桌面侧栏 / 移动横向目录）+ 分节布局；代码块见 CodeBlock（纯文本 + 复制）。
 */
export function GuidePage() {
  const [active, setActive] = useState<SectionId>(SECTIONS[0].id)

  // 滚动容器是布局壳的 <main>（overflow-y-auto）：滚动时高亮视口顶部的分节
  useEffect(() => {
    const scroller = document.querySelector('main')
    if (!scroller) return
    const onScroll = () => {
      const topLine = scroller.getBoundingClientRect().top + 96
      // 滚到底时末节可能到不了顶部（滚动钳制）：此时高亮最后一节
      const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2
      let current = SECTIONS[0].id
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id)
        if (el && el.getBoundingClientRect().top <= topLine) current = s.id
      }
      if (atBottom) current = SECTIONS[SECTIONS.length - 1].id
      setActive(current)
    }
    onScroll()
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => scroller.removeEventListener('scroll', onScroll)
  }, [])

  // 锚点跳转：即时滚动（不做平滑长动画，符合交互规范动效约束），不改 URL
  const jump = (id: SectionId) => (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    setActive(id)
    document.getElementById(id)?.scrollIntoView?.({ block: 'start' })
  }

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <h1 className="text-base font-semibold">{guideStr.title}</h1>
        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
          {guideStr.subtitle}
        </p>
      </header>

      {/* 移动端：横向分节目录 */}
      <nav
        aria-label={guideStr.tocLabel}
        data-testid="guide-toc-mobile"
        className="mb-5 flex gap-1.5 overflow-x-auto pb-1 lg:hidden"
      >
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            onClick={jump(s.id)}
            className={tocLinkClass(active === s.id, 'shrink-0 border border-border px-2.5 py-1')}
          >
            {s.label}
          </a>
        ))}
      </nav>

      <div className="grid gap-8 lg:grid-cols-[176px_minmax(0,1fr)]">
        {/* 桌面端：侧栏锚点（sticky 跟随内容滚动） */}
        <nav
          aria-label={guideStr.tocLabel}
          data-testid="guide-toc-desktop"
          className="sticky top-0 hidden self-start lg:block"
        >
          <ul className="flex flex-col gap-0.5">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  onClick={jump(s.id)}
                  aria-current={active === s.id ? 'true' : undefined}
                  className={tocLinkClass(active === s.id, 'block px-2.5 py-1.5')}
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-12">
          <QuickStartSection />
          <CSharpSdkSection />
          <DiIntegrationSection />
          <ServiceRegisterSection />
          <PitfallsSection />
          <FaqSection />
          <p className="border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
            {guideStr.footnote}
          </p>
        </div>
      </div>
    </div>
  )
}
