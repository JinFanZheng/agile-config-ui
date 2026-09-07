import { guideStr } from '../../../strings/guide'
import { CodeBlock } from '../CodeBlock'
import { Bullets, GuideSection, Note, SubHeading, T } from '../GuidePrimitives'
import { SNIPPETS } from '../snippets'

/** §3 依赖注入与 IConfiguration：AddAgileConfig Provider + AddAgileConfig DI + IOptionsMonitor 热更新（实测） */
export function DiIntegrationSection() {
  const s = guideStr.diIntegration
  return (
    <GuideSection id={guideStr.sections.diIntegration.id} title={guideStr.sections.diIntegration.label}>
      <T text={s.intro} />

      <SubHeading>{s.setupTitle}</SubHeading>
      <T text={s.setupBody} />
      <CodeBlock lang="csharp" code={SNIPPETS.diSetup} />
      <Note kind="warning">
        <T text={s.setupWarn} />
      </Note>

      <SubHeading>{s.diTitle}</SubHeading>
      <T text={s.diBody} />
      <CodeBlock lang="csharp" code={SNIPPETS.diOptions} />

      <SubHeading>{s.factsTitle}</SubHeading>
      <Bullets items={s.factsItems} />
    </GuideSection>
  )
}
