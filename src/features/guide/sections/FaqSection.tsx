import { guideStr } from '../../../strings/guide'
import { GuideSection, Note, T } from '../GuidePrimitives'

/** §5 FAQ：补丁 vs 全量保存 / 多环境隔离 / 继承应用 */
export function FaqSection() {
  const s = guideStr.faq
  return (
    <GuideSection id={guideStr.sections.faq.id} title={guideStr.sections.faq.label}>
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-[13px] font-semibold">{s.q1}</h3>
          <T text={s.a1P1} />
          <T text={s.a1Patch} />
          <T text={s.a1Full} />
          <Note kind="warning">
            <T text={s.a1Warn} />
          </Note>
        </div>

        <div className="space-y-2">
          <h3 className="text-[13px] font-semibold">{s.q2}</h3>
          <T text={s.a2P1} />
          <T text={s.a2P2} />
        </div>

        <div className="space-y-2">
          <h3 className="text-[13px] font-semibold">{s.q3}</h3>
          <T text={s.a3P1} />
          <T text={s.a3P2} />
          <T text={s.a3P3} />
        </div>
      </div>
    </GuideSection>
  )
}
