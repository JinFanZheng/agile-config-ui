import { guideStr } from '../../../strings/guide'
import { CodeBlock } from '../CodeBlock'
import { DefTable, GuideSection, Note, SubHeading, T } from '../GuidePrimitives'
import { SNIPPETS } from '../snippets'

/** §4 格式与归一化实测坑位（全部为 1.13.2 实测结论，见 docs/AGENT_HANDOFF.md §5 与 ITER-08） */
export function PitfallsSection() {
  const s = guideStr.pitfalls
  return (
    <GuideSection id={guideStr.sections.pitfalls.id} title={guideStr.sections.pitfalls.label}>
      <T text={s.intro} />

      <SubHeading>{s.flatTitle}</SubHeading>
      <T text={s.flatBody} />
      <CodeBlock lang="text" code={SNIPPETS.flatKeys} />
      <DefTable head={s.flatHead} rows={s.flatRows} monoAll />

      <SubHeading>{s.arrayTitle}</SubHeading>
      <T text={s.arrayBody} />

      <SubHeading>{s.normTitle}</SubHeading>
      <T text={s.normBody} />
      <DefTable head={s.normHead} rows={s.normRows} monoAll />

      <SubHeading>{s.groupTitle}</SubHeading>
      <T text={s.groupBody} />

      <SubHeading>{s.editStatusTitle}</SubHeading>
      <T text={s.editStatusBody} />
      <Note kind="warning">
        <T text={s.editStatusWarn} />
      </Note>
    </GuideSection>
  )
}
