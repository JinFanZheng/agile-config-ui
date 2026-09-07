import { guideStr } from '../../../strings/guide'
import { CodeBlock } from '../CodeBlock'
import { GuideSection, Note, Step, T } from '../GuidePrimitives'
import { SNIPPETS } from '../snippets'

/** §1 快速开始：建应用 → 接入 → 改配置 → 发布 → 秒级生效 */
export function QuickStartSection() {
  const s = guideStr.quickStart
  return (
    <GuideSection id={guideStr.sections.quickStart.id} title={guideStr.sections.quickStart.label}>
      <T text={s.intro} />
      <ol className="space-y-5">
        <Step n={1} title={s.step1Title}>
          <T text={s.step1Body} />
          <Note kind="warning">
            <T text={s.step1SecretWarn} />
          </Note>
        </Step>
        <Step n={2} title={s.step2Title}>
          <T text={s.step2Body} />
          <CodeBlock lang="bash" code={SNIPPETS.install} />
        </Step>
        <Step n={3} title={s.step3Title}>
          <T text={s.step3Body} />
          <CodeBlock lang="csharp" code={SNIPPETS.quickStart} />
          <Note>
            <T text={s.step3Note} />
          </Note>
        </Step>
        <Step n={4} title={s.step4Title}>
          <T text={s.step4Body} />
        </Step>
        <Step n={5} title={s.step5Title}>
          <T text={s.step5Body} />
        </Step>
        <Step n={6} title={s.step6Title}>
          <T text={s.step6Body} />
          <Note>
            <T text={s.step6ClientsNote} />
          </Note>
        </Step>
      </ol>
    </GuideSection>
  )
}
