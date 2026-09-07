import type { ReactNode } from 'react'
import { Card, CardHeader, CardTitle } from '../../components/ui/card'
import { THEMES } from '../../lib/themes'
import { cn } from '../../lib/utils'
import {
  EDITOR_FONT_SIZES,
  UI_FONT_SIZES,
  useSettingsStore,
  type EditorFontSize,
  type UiFontSize,
} from '../../stores/settings'
import { settingsStr } from '../../strings/settings'

/** 设置行：左侧标题+说明，右侧控件（触屏纵向堆叠） */
function SettingRow({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-b border-border px-4 py-3.5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground">{title}</div>
        {desc && <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{desc}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

/** 分段单选（原生 radio，键盘可达：Tab 聚焦 + 方向键切换） */
function SegmentedRadio<T extends string | number>({
  name,
  ariaLabel,
  value,
  options,
  onChange,
}: {
  name: string
  ariaLabel: string
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex rounded-md border border-border bg-elevated p-0.5"
    >
      {options.map((o) => (
        <label key={String(o.value)} className="group relative cursor-pointer">
          <input
            type="radio"
            name={name}
            value={String(o.value)}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            className="peer absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
          />
          <span className="flex h-6 items-center rounded-sm px-2.5 text-xs text-muted-foreground transition-colors duration-150 ease-out group-hover:text-foreground peer-checked:bg-selected peer-checked:font-medium peer-checked:text-selected-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50">
            {o.label}
          </span>
        </label>
      ))}
    </div>
  )
}

/** 开关（role=switch，原生 button 键盘可达） */
function Switch({
  checked,
  ariaLabel,
  onToggle,
}: {
  checked: boolean
  ariaLabel: string
  onToggle: (next: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onToggle(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full outline-none transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-primary/50',
        checked ? 'bg-primary' : 'bg-border-strong'
      )}
    >
      <span className="sr-only">{checked ? settingsStr.motionOn : settingsStr.motionOff}</span>
      <span
        className={cn(
          'ml-0.5 inline-block h-4 w-4 rounded-full bg-panel transition-transform duration-150 ease-out',
          checked ? 'translate-x-4' : 'translate-x-0'
        )}
      />
    </button>
  )
}

/** 设置中心：主题 / 界面字号 / 编辑器字号 / 动效，全部本地持久化 + 即时生效（ITER-09） */
export function SettingsPage() {
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const uiFontSize = useSettingsStore((s) => s.uiFontSize)
  const setUiFontSize = useSettingsStore((s) => s.setUiFontSize)
  const editorFontSize = useSettingsStore((s) => s.editorFontSize)
  const setEditorFontSize = useSettingsStore((s) => s.setEditorFontSize)
  const motion = useSettingsStore((s) => s.motion)
  const setMotion = useSettingsStore((s) => s.setMotion)

  return (
    <div>
      <h1 className="mb-1 text-base font-semibold">{settingsStr.title}</h1>
      <p className="mb-5 text-xs text-muted-foreground">{settingsStr.intro}</p>

      <Card className="mb-4">
        <CardHeader className="border-b border-border">
          <CardTitle>{settingsStr.appearance}</CardTitle>
        </CardHeader>
        <SettingRow title={settingsStr.theme} desc={settingsStr.themeDesc}>
          <div role="radiogroup" aria-label={settingsStr.theme} className="flex max-w-md flex-wrap gap-1.5">
            {THEMES.map(({ id, label, swatch }) => {
              const active = theme === id
              return (
                <label key={id} className="group relative cursor-pointer">
                  <input
                    type="radio"
                    name="settings-theme"
                    value={id}
                    checked={active}
                    onChange={() => setTheme(id)}
                    className="peer absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
                  />
                  <span
                    className={cn(
                      'flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs transition-colors duration-150 ease-out peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50',
                    active
                      ? 'border-primary bg-selected font-medium text-selected-foreground'
                      : 'border-border text-muted-foreground group-hover:bg-hover group-hover:text-foreground'
                    )}
                  >
                    <span className="flex overflow-hidden rounded-sm border border-border">
                      {swatch.map((c) => (
                        <span key={c} className="h-3.5 w-1.5" style={{ backgroundColor: c }} />
                      ))}
                    </span>
                    {label}
                  </span>
                </label>
              )
            })}
          </div>
        </SettingRow>
        <SettingRow title={settingsStr.uiFontSize} desc={settingsStr.uiFontSizeDesc}>
          <SegmentedRadio<UiFontSize>
            name="settings-ui-font"
            ariaLabel={settingsStr.uiFontSize}
            value={uiFontSize}
            options={UI_FONT_SIZES.map((v) => ({
              value: v,
              label: settingsStr.uiFontSizeOptions[v],
            }))}
            onChange={setUiFontSize}
          />
        </SettingRow>
        <SettingRow title={settingsStr.motion} desc={settingsStr.motionDesc}>
          <Switch checked={motion} ariaLabel={settingsStr.motion} onToggle={setMotion} />
        </SettingRow>
      </Card>

      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle>{settingsStr.editor}</CardTitle>
        </CardHeader>
        <SettingRow title={settingsStr.editorFont} desc={settingsStr.editorFontDesc}>
          <SegmentedRadio<EditorFontSize>
            name="settings-editor-font"
            ariaLabel={settingsStr.editorFont}
            value={editorFontSize}
            options={EDITOR_FONT_SIZES.map((v) => ({ value: v, label: String(v) }))}
            onChange={setEditorFontSize}
          />
        </SettingRow>
        <div className="px-4 pb-4">
          <div
            className="rounded-md border border-border bg-input px-3 py-2 font-mono leading-relaxed text-foreground"
            style={{ fontSize: editorFontSize }}
          >
            {settingsStr.editorFontPreview}
          </div>
        </div>
      </Card>
    </div>
  )
}
