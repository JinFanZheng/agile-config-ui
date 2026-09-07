import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { guideStr } from '../../strings/guide'
import { GuidePage } from './GuidePage'

// jsdom 无剪贴板：注入 mock（CodeBlock 复制走 navigator.clipboard）
const writeText = vi.fn().mockResolvedValue(undefined)
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText },
  configurable: true,
})

afterEach(cleanup)

describe('GuidePage（ITER-10）', () => {
  it('渲染五个分节标题与目录锚点（分节 id 可定位）', () => {
    render(<GuidePage />)
    for (const s of Object.values(guideStr.sections)) {
      expect(screen.getByRole('heading', { name: s.label })).toBeInTheDocument()
      expect(document.getElementById(s.id)).not.toBeNull()
    }
    // 目录链接与分节一一对应（移动 + 桌面两套目录）
    const links = screen.getAllByRole('link', { name: guideStr.sections.faq.label })
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', `#${guideStr.sections.faq.id}`)
  })

  it('代码块按纯文本渲染且一键复制有内联反馈（不发 Toast）', async () => {
    render(<GuidePage />)
    // 纯文本渲染：pre > code 文本节点即源码（无 HTML 注入面）
    const pre = document.querySelector('[data-testid="guide-code"] pre')
    expect(pre).not.toBeNull()
    expect(pre?.textContent).toContain('dotnet add package AgileConfig.Client')

    const copyBtn = screen.getAllByRole('button', { name: guideStr.code.copy })[0]
    fireEvent.click(copyBtn)
    expect(await screen.findByRole('button', { name: guideStr.code.copied })).toBeInTheDocument()
    expect(writeText).toHaveBeenCalledTimes(1)
  })

  it('实测坑位关键事实在页面呈现（EditStatus 枚举 / 归一化 / 扁平键）', () => {
    render(<GuidePage />)
    expect(screen.getByText(/Add=0 \/ Edit=1 \/ Deleted=2 \/ Commit=10/)).toBeInTheDocument()
    expect(screen.getByText('"True"', { exact: true })).toBeInTheDocument()
    expect(screen.getByText(/a:b:c（多级逐级拼接）/)).toBeInTheDocument()
  })
})
