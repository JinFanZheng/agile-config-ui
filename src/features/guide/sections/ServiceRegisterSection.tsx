import { guideStr } from '../../../strings/guide'
import { CodeBlock } from '../CodeBlock'
import { DefTable, GuideSection, Note, SubHeading, T } from '../GuidePrimitives'
import { SNIPPETS } from '../snippets'

/** §3 服务注册与发现：RegisterInfo / 三种心跳模式 / RegisterService / DiscoveryService */
export function ServiceRegisterSection() {
  const s = guideStr.serviceRegister
  return (
    <GuideSection
      id={guideStr.sections.serviceRegister.id}
      title={guideStr.sections.serviceRegister.label}
    >
      <T text={s.intro} />

      <SubHeading>{s.registerInfoTitle}</SubHeading>
      <T text={s.registerInfoBody} />
      <CodeBlock lang="csharp" code={SNIPPETS.registerInfo} />

      <SubHeading>{s.modesTitle}</SubHeading>
      <DefTable head={s.modesHead} rows={s.modesRows} />
      <Note kind="warning">
        <T text={s.checkUrlWarn} />
      </Note>
      <CodeBlock lang="csharp" code={SNIPPETS.healthEndpoint} />

      <SubHeading>{s.regLifecycleTitle}</SubHeading>
      <T text={s.regLifecycleBody} />
      <CodeBlock lang="csharp" code={SNIPPETS.registerLifecycle} />
      <Note>
        <T text={s.regNote} />
      </Note>

      <SubHeading>{s.discoveryTitle}</SubHeading>
      <T text={s.discoveryBody} />
      <CodeBlock lang="csharp" code={SNIPPETS.discovery} />
      <Note>
        <T text={s.discoveryNote} />
      </Note>
    </GuideSection>
  )
}
