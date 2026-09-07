import { guideStr } from '../../../strings/guide'
import { CodeBlock } from '../CodeBlock'
import { Bullets, DefTable, GuideSection, Note, SubHeading, T } from '../GuidePrimitives'
import { SNIPPETS } from '../snippets'

/** §2 C# SDK 接入：Options / 生命周期 / ConfigChanged 与 ReLoaded（防御式写法） */
export function CSharpSdkSection() {
  const s = guideStr.csharpSdk
  return (
    <GuideSection id={guideStr.sections.csharpSdk.id} title={guideStr.sections.csharpSdk.label}>
      <T text={s.intro} />

      <SubHeading>{s.optionsTitle}</SubHeading>
      <DefTable head={s.optionsHead} rows={s.optionsRows} />
      <Note kind="warning">
        <T text={s.nodesWarn} />
      </Note>

      <SubHeading>{s.lifecycleTitle}</SubHeading>
      <T text={s.lifecycleP1} />
      <T text={s.lifecycleP2} />
      <CodeBlock lang="csharp" code={SNIPPETS.lifecycle} />

      <SubHeading>{s.eventsTitle}</SubHeading>
      <T text={s.eventsP1} />
      <T text={s.eventsP2} />
      <CodeBlock lang="csharp" code={SNIPPETS.events} />

      <SubHeading>{s.defensiveTitle}</SubHeading>
      <Bullets items={s.defensiveItems} />
      <CodeBlock lang="csharp" code={SNIPPETS.defensive} />
      <Note>
        <T text={s.defensiveNote} />
      </Note>
    </GuideSection>
  )
}
