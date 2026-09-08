import { guideStr } from '../strings/guide'
import { SNIPPETS } from '../features/guide/snippets'

/**
 * llms.txt 生成器（ITER-18）：把产品内「接入指南」同源导出为 AI 助手可抓取的 markdown。
 * 仅组合 src/strings/guide.ts 与 snippets.ts 的既有文案/代码，不新增事实（防漂移）。
 * 调用方：scripts/gen-llms.ts（写 public/llms*.txt）；一致性由 src/lib/llms.test.ts 锁定。
 */

const FENCE = '```'

function fence(lang: string, code: string): string {
  return `${FENCE}${lang}\n${code}\n${FENCE}`
}

function table(head: readonly string[], rows: readonly (readonly string[])[]): string {
  const cols = head.length
  const line = (cells: readonly string[]) => `| ${cells.join(' | ')} |`
  return [line(head), `| ${Array(cols).fill('---').join(' | ')} |`, ...rows.map(line)].join('\n')
}

function warn(text: string): string {
  return `> ⚠️ ${text}`
}

/** /llms.txt：索引 + 快速事实（llms.txt 约定的轻入口） */
export function buildLlmsIndex(): string {
  return `# AgileConfig 接入指南

> ${guideStr.subtitle}
> 本文与产品内「接入指南」页同源生成；结论基于 AgileConfig 服务端 1.13.2 与 AgileConfig.Client 1.9.1 实测。

## 文档

- [完整接入文档（单文件，含全部代码示例与实测坑位）](llms-full.txt): ${[
    guideStr.sections.quickStart.label,
    guideStr.sections.csharpSdk.label,
    guideStr.sections.diIntegration.label,
    guideStr.sections.serviceRegister.label,
    guideStr.sections.pitfalls.label,
    guideStr.sections.faq.label,
  ].join(' / ')}
- [产品内网页版接入指南](guide)：与本文同源（需登录管理台）

## 快速事实（动手前先读）

- 客户端视角的配置永远是「扁平键值对」：管理端 JSON 的嵌套对象 → 冒号拼接键（a.b.c → a:b:c）；数组 → 数字索引键（hosts:0 / hosts:1）；空分组键是裸键，无前导冒号
- 字面量归一化：true → "True"、false → "False"、null → ""（空串）、数字 → 十进制文本；客户端读到的 value 永远是字符串
- Secret 不会自动生成（留空客户端连不上）；Nodes 必须填「客户端进程」可达的地址（与管理台访问地址不一定相同）
- 配置改动必须「发布」后才对客户端生效；发布后 WebSocket 推送，实测约 1 秒生效
- SaveJson / SaveKvList 的 isPatch=false 是全量语义：未出现在提交里的既有键会被标记「待发布删除」——大批量误删的头号来源
`
}

/** /llms-full.txt：全量 markdown（结构与 /guide 六节一致） */
export function buildLlmsFull(): string {
  const g = guideStr
  const parts: string[] = []

  parts.push(`# AgileConfig 接入指南（完整版）

> ${g.subtitle}
> 由产品内「接入指南」同源生成（源：src/strings/guide.ts + src/features/guide/snippets.ts）；结论基于 AgileConfig 服务端 1.13.2 与 AgileConfig.Client 1.9.1 实测。示例占位符统一 your-app-id / your-app-secret / http://your-node:5000。`)

  // §1 快速开始
  const q = g.quickStart
  parts.push(`## ${g.sections.quickStart.label}

${q.intro}

### ${q.step1Title}

${q.step1Body}

${warn(q.step1SecretWarn)}

### ${q.step2Title}

${q.step2Body}

${fence('bash', SNIPPETS.install)}

### ${q.step3Title}

${q.step3Body}

> 💡 ${q.step3Note}

${fence('csharp', SNIPPETS.quickStart)}

### ${q.step4Title}

${q.step4Body}

### ${q.step5Title}

${q.step5Body}

### ${q.step6Title}

${q.step6Body}

> 💡 ${q.step6ClientsNote}`)

  // §2 C# SDK
  const c = g.csharpSdk
  parts.push(`## ${g.sections.csharpSdk.label}

${c.intro}

### ${c.optionsTitle}

${table(c.optionsHead, c.optionsRows)}

${warn(c.nodesWarn)}

### ${c.lifecycleTitle}

${c.lifecycleP1}

${c.lifecycleP2}

${fence('csharp', SNIPPETS.lifecycle)}

### ${c.eventsTitle}

${c.eventsP1}

${c.eventsP2}

${fence('csharp', SNIPPETS.events)}

### ${c.defensiveTitle}

${c.defensiveItems.map((i) => `- ${i}`).join('\n')}

> 💡 ${c.defensiveNote}

${fence('csharp', SNIPPETS.defensive)}`)

  // §3 依赖注入
  const d = g.diIntegration
  parts.push(`## ${g.sections.diIntegration.label}

${d.intro}

### ${d.setupTitle}

${d.setupBody}

${fence('csharp', SNIPPETS.diSetup)}

${warn(d.setupWarn)}

### ${d.diTitle}

${d.diBody}

${fence('csharp', SNIPPETS.diOptions)}

### ${d.factsTitle}

${d.factsItems.map((i) => `- ${i}`).join('\n')}`)

  // §4 服务注册
  const r = g.serviceRegister
  parts.push(`## ${g.sections.serviceRegister.label}

${r.intro}

### ${r.registerInfoTitle}

${r.registerInfoBody}

${fence('csharp', SNIPPETS.registerInfo)}

### ${r.modesTitle}

${table(r.modesHead, r.modesRows)}

${warn(r.checkUrlWarn)}

server 心跳模式的最小健康端点：

${fence('csharp', SNIPPETS.healthEndpoint)}

### ${r.regLifecycleTitle}

${r.regLifecycleBody}

${fence('csharp', SNIPPETS.registerLifecycle)}

> 💡 ${r.regNote}

### ${r.discoveryTitle}

${r.discoveryBody}

${fence('csharp', SNIPPETS.discovery)}

> 💡 ${r.discoveryNote}`)

  // §5 坑位
  const p = g.pitfalls
  parts.push(`## ${g.sections.pitfalls.label}

${p.intro}

### ${p.flatTitle}

${p.flatBody}

${table(p.flatHead, p.flatRows)}

### ${p.arrayTitle}

${p.arrayBody}

### ${p.normTitle}

${p.normBody}

${table(p.normHead, p.normRows)}

### ${p.groupTitle}

${p.groupBody}

${fence('text', SNIPPETS.flatKeys)}

### ${p.editStatusTitle}

${p.editStatusBody}

${warn(p.editStatusWarn)}`)

  // §6 FAQ
  const f = g.faq
  parts.push(`## ${g.sections.faq.label}

### ${f.q1}

${f.a1P1}

- ${f.a1Patch}
- ${f.a1Full}

${warn(f.a1Warn)}

### ${f.q2}

${f.a2P1}

${f.a2P2}

### ${f.q3}

${f.a3P1}

${f.a3P2}

${f.a3P3}

---

${g.footnote}`)

  return parts.join('\n\n') + '\n'
}
