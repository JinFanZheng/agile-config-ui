import type { ReactNode } from 'react'
import { Monitor } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '../../components/ui/card'
import { isDarkTheme, SYSTEM_THEME, THEMES, type ThemeId } from '../../lib/themes'
import { cn } from '../../lib/utils'
import {
  DEFAULT_CONFIG_VIEWS,
  EDITOR_FONT_SIZES,
  UI_FONT_SIZES,
  useSettingsStore,
  type DefaultConfigView,
  type EditorFontSize,
  type UiFontSize,
} from '../../stores/settings'
import { settingsStr } from '../../strings/settings'
import { themeStr } from '../../strings/theme'

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

/** 主题色卡（网格项）：三色条 + 名称居中，透明 radio 铺满整卡（点击面=整卡，键盘可达） */
function ThemeCardChip({
  id,
  label,
  swatch,
  checked,
  onSelect,
}: {
  id: string
  label: string
  swatch: readonly [string, string, string]
  checked: boolean
  onSelect: () => void
}) {
  return (
    <label className="group relative cursor-pointer">
      <input
        type="radio"
        name="settings-theme"
        value={id}
        checked={checked}
        onChange={onSelect}
        className="peer absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
      />
      <span
        className={cn(
          'flex flex-col gap-1.5 rounded-md border p-2 transition-colors duration-150 ease-out peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50',
          checked ? 'border-primary bg-selected' : 'border-border group-hover:bg-hover'
        )}
      >
        <span className="flex h-2 overflow-hidden rounded-sm border border-border">
          {swatch.map((c) => (
            <span key={c} className="h-full flex-1" style={{ backgroundColor: c }} />
          ))}
        </span>
        <span
          className={cn(
            'truncate text-center text-xs',
            checked
              ? 'font-medium text-selected-foreground'
              : 'text-muted-foreground group-hover:text-foreground'
          )}
        >
          {label}
        </span>
      </span>
    </label>
  )
}

/** 跟随系统的深/浅映射选择（原生 select，仅列对应深浅组的主题） */
function SystemMappingSelect({
  idSuffix,
  label,
  value,
  options,
  onChange,
}: {
  idSuffix: 'dark' | 'light'
  label: string
  value: ThemeId
  options: readonly { id: ThemeId; label: string }[]
  onChange: (id: ThemeId) => void
}) {
  return (
    <label
      htmlFor={`system-mapping-${idSuffix}`}
      className="flex items-center gap-2 text-xs text-muted-foreground"
    >
      {label}
      <select
        id={`system-mapping-${idSuffix}`}
        value={value}
        onChange={(e) => onChange(e.target.value as ThemeId)}
        className="h-6 rounded-md border border-border bg-input px-1.5 text-xs text-foreground outline-none transition-colors duration-150 ease-out hover:border-border-strong focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

/** 跟随系统块：整块可选中的 radio 项；选中时展开深/浅映射配置（映射变更即时生效） */
function SystemThemeBlock({
  active,
  onSelect,
  systemDark,
  systemLight,
  onSystemDarkChange,
  onSystemLightChange,
}: {
  active: boolean
  onSelect: () => void
  systemDark: ThemeId
  systemLight: ThemeId
  onSystemDarkChange: (id: ThemeId) => void
  onSystemLightChange: (id: ThemeId) => void
}) {
  const darkOptions = THEMES.filter((t) => isDarkTheme(t.id))
  const lightOptions = THEMES.filter((t) => !isDarkTheme(t.id))
  return (
    <div
      className={cn(
        'rounded-md border p-3 transition-colors duration-150 ease-out',
        active ? 'border-primary bg-selected/40' : 'border-border'
      )}
    >
      <label className="group relative flex cursor-pointer items-start gap-2">
        <input
          type="radio"
          name="settings-theme"
          value={SYSTEM_THEME}
          checked={active}
          onChange={onSelect}
          className="peer absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
        />
        <Monitor className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50" />
        <span className="min-w-0">
          <span className={cn('block text-xs', active && 'font-medium text-foreground')}>
            {themeStr.system}
          </span>
          <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
            {themeStr.systemDesc}
          </span>
        </span>
      </label>
      {active && (
        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-3 sm:pl-6">
          <SystemMappingSelect
            idSuffix="dark"
            label={settingsStr.systemWhenDark}
            value={systemDark}
            options={darkOptions}
            onChange={onSystemDarkChange}
          />
          <SystemMappingSelect
            idSuffix="light"
            label={settingsStr.systemWhenLight}
            value={systemLight}
            options={lightOptions}
            onChange={onSystemLightChange}
          />
        </div>
      )}
    </div>
  )
}

/** 设置中心：主题（跟随系统块 + 浅/深色卡网格）/ 界面字号 / 编辑器字号 / 动效，全部本地持久化 + 即时生效 */
export function SettingsPage() {
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const systemDark = useSettingsStore((s) => s.systemDark)
  const setSystemDark = useSettingsStore((s) => s.setSystemDark)
  const systemLight = useSettingsStore((s) => s.systemLight)
  const setSystemLight = useSettingsStore((s) => s.setSystemLight)
  const uiFontSize = useSettingsStore((s) => s.uiFontSize)
  const setUiFontSize = useSettingsStore((s) => s.setUiFontSize)
  const editorFontSize = useSettingsStore((s) => s.editorFontSize)
  const setEditorFontSize = useSettingsStore((s) => s.setEditorFontSize)
  const motion = useSettingsStore((s) => s.motion)
  const defaultConfigView = useSettingsStore((s) => s.defaultConfigView)
  const setDefaultConfigView = useSettingsStore((s) => s.setDefaultConfigView)
  const editorWordWrap = useSettingsStore((s) => s.editorWordWrap)
  const setEditorWordWrap = useSettingsStore((s) => s.setEditorWordWrap)
  const setMotion = useSettingsStore((s) => s.setMotion)

  return (
    <div>
      <h1 className="mb-1 text-base font-semibold">{settingsStr.title}</h1>
      <p className="mb-5 text-xs text-muted-foreground">{settingsStr.intro}</p>

      <Card className="mb-4">
        <CardHeader className="border-b border-border">
          <CardTitle>{settingsStr.appearance}</CardTitle>
        </CardHeader>
        {/* 主题：全宽区块（跟随系统块 + 浅/深色卡网格），选项多，不再用左右分栏的 SettingRow */}
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3.5 last:border-b-0">
          <div>
            <div className="text-sm font-medium text-foreground">{settingsStr.theme}</div>
            <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {settingsStr.themeDesc}
            </div>
          </div>
          {/* 单一 radiogroup：跟随系统块 + 浅/深两组色卡，方向键在全部选项间可达；映射选择是独立 combobox */}
          <div role="radiogroup" aria-label={settingsStr.theme} className="flex flex-col gap-3">
            <SystemThemeBlock
              active={theme === SYSTEM_THEME}
              onSelect={() => setTheme(SYSTEM_THEME)}
              systemDark={systemDark}
              systemLight={systemLight}
              onSystemDarkChange={setSystemDark}
              onSystemLightChange={setSystemLight}
            />
            {(
              [
                [themeStr.groups.light, THEMES.filter((t) => !isDarkTheme(t.id))],
                [themeStr.groups.dark, THEMES.filter((t) => isDarkTheme(t.id))],
              ] as const
            ).map(([groupLabel, items]) => (
              <div key={groupLabel} className="flex flex-col gap-1.5">
                <span className="text-[10px] text-muted-foreground/60">{groupLabel}</span>
                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
                  {items.map(({ id, label, swatch }) => (
                    <ThemeCardChip
                      key={id}
                      id={id}
                      label={label}
                      swatch={swatch}
                      checked={theme === id}
                      onSelect={() => setTheme(id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
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
        <SettingRow title={settingsStr.defaultConfigView} desc={settingsStr.defaultConfigViewDesc}>
          <SegmentedRadio<DefaultConfigView>
            name="settings-default-view"
            ariaLabel={settingsStr.defaultConfigView}
            value={defaultConfigView}
            options={DEFAULT_CONFIG_VIEWS.map((v) => ({
              value: v,
              label: settingsStr.defaultConfigViewOptions[v],
            }))}
            onChange={setDefaultConfigView}
          />
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
        <SettingRow title={settingsStr.editorWordWrap} desc={settingsStr.editorWordWrapDesc}>
          <Switch checked={editorWordWrap} ariaLabel={settingsStr.editorWordWrap} onToggle={setEditorWordWrap} />
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
