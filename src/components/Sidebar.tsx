import { memo, useId, type CSSProperties, type ChangeEvent, type ReactNode } from 'react'
import {
  ASPECT_RATIOS,
  ASPECT_RATIO_IDS,
  FONTS,
  type AspectRatio,
  type Template,
  type TemplateColors,
  type TemplateParams,
} from '../engine'
import { DURATION_RANGE, HEADLINE_MAX, SPEED_RANGE, SUBLINE_MAX } from '../limits'
import { PALETTES, sameColors } from '../palettes'
import { TemplateThumb } from './TemplateThumb'


interface SidebarProps {
  templates: readonly Template[]
  selectedId: string
  onSelectTemplate: (id: string) => void
  aspect: AspectRatio
  onAspect: (aspect: AspectRatio) => void
  params: TemplateParams
  onParams: (patch: Partial<TemplateParams>) => void
  /** Colors shown on thumbnails: the user's colors once customized, else each template's defaults. */
  customColors: TemplateColors | null
  onColors: (colors: TemplateColors) => void
  onResetColors: () => void
  logoName: string | null
  onLogoFile: (file: File | null) => void
  duration: number
  onDuration: (seconds: number) => void
  /** Locks every control (e.g. while exporting). */
  disabled?: boolean
}

function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2 className="panel-title">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

const COLOR_FIELDS: { key: keyof TemplateColors; label: string }[] = [
  { key: 'bg', label: 'Background' },
  { key: 'primary', label: 'Text' },
  { key: 'accent', label: 'Accent' },
]

export const Sidebar = memo(function Sidebar(props: SidebarProps) {
  const { templates, selectedId, onSelectTemplate, aspect, onAspect, params, onParams } = props
  const { customColors, onColors, onResetColors, logoName, onLogoFile, duration, onDuration, disabled } = props
  const ids = { headline: useId(), subline: useId(), speed: useId(), duration: useId(), logo: useId() }
  const stage = ASPECT_RATIOS[aspect]
  const thumbStyle = { '--arw': stage.width, '--arh': stage.height } as CSSProperties

  return (
    <aside className="sidebar" aria-label="Templates and customization">
      <fieldset className="sidebar-fieldset" disabled={disabled}>
      <Section title="Templates">
        <div className="template-grid" role="listbox" aria-label="Templates">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              role="option"
              aria-selected={t.id === selectedId}
              className="template-card"
              onClick={() => onSelectTemplate(t.id)}
            >
              <span className="thumb" style={thumbStyle}>
                <TemplateThumb
                  template={t}
                  stage={stage}
                  params={{ ...params, colors: customColors ?? t.defaultColors }}
                />
              </span>
              <span className="template-name">{t.name}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Format">
        <div className="segmented four" role="radiogroup" aria-label="Aspect ratio">
          {ASPECT_RATIO_IDS.map((id) => {
            const r = ASPECT_RATIOS[id]
            const k = 18 / Math.max(r.width, r.height)
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={aspect === id}
                className="seg"
                onClick={() => onAspect(id)}
                title={`${r.label} · ${r.width}×${r.height}`}
              >
                <span className="ratio-icon" style={{ width: r.width * k, height: r.height * k }} aria-hidden="true" />
                <span>{id}</span>
              </button>
            )
          })}
        </div>
      </Section>

      <Section title="Text">
        <label className="field" htmlFor={ids.headline}>
          <span className="field-label">Headline</span>
          <input
            id={ids.headline}
            className="input"
            value={params.headline}
            maxLength={HEADLINE_MAX}
            onChange={(e) => onParams({ headline: e.target.value })}
            placeholder="Your headline"
          />
        </label>
        <label className="field" htmlFor={ids.subline}>
          <span className="field-label">Subline</span>
          <input
            id={ids.subline}
            className="input"
            value={params.subline}
            maxLength={SUBLINE_MAX}
            onChange={(e) => onParams({ subline: e.target.value })}
            placeholder="Optional"
          />
        </label>
      </Section>

      <Section
        title="Colors"
        action={
          customColors && (
            <button type="button" className="link-btn" onClick={onResetColors}>
              Template default
            </button>
          )
        }
      >
        <div className="color-row">
          {COLOR_FIELDS.map(({ key, label }) => (
            <label key={key} className="color-field">
              <input
                type="color"
                value={params.colors[key]}
                onChange={(e) => onColors({ ...params.colors, [key]: e.target.value })}
                aria-label={`${label} color`}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
        <div className="palette-grid" role="radiogroup" aria-label="Color palettes">
          {PALETTES.map((p) => (
            <button
              key={p.name}
              type="button"
              role="radio"
              aria-checked={sameColors(p.colors, params.colors)}
              className="palette"
              onClick={() => onColors(p.colors)}
              title={p.name}
              aria-label={p.name}
            >
              <span style={{ background: p.colors.bg }} />
              <span style={{ background: p.colors.primary }} />
              <span style={{ background: p.colors.accent }} />
            </button>
          ))}
        </div>
      </Section>

      <Section title="Font">
        <div className="font-grid" role="radiogroup" aria-label="Font">
          {FONTS.map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={params.font === f}
              className="seg font-option"
              style={{ fontFamily: `"${f}", system-ui, sans-serif` }}
              onClick={() => onParams({ font: f })}
            >
              {f}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Logo">
        <div className="logo-row">
          <label className="file-btn" htmlFor={ids.logo}>
            {logoName ? 'Replace logo' : 'Upload logo'}
          </label>
          <input
            id={ids.logo}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
            className="visually-hidden"
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              onLogoFile(e.target.files?.[0] ?? null)
              e.target.value = ''
            }}
          />
          {logoName && (
            <>
              <span className="logo-name" title={logoName}>
                {logoName}
              </span>
              <button type="button" className="link-btn" onClick={() => onLogoFile(null)}>
                Remove
              </button>
            </>
          )}
        </div>
        <p className="hint">Stays on your device. Nothing is uploaded.</p>
      </Section>

      <Section title="Timing">
        <label className="field" htmlFor={ids.speed}>
          <span className="field-label">
            Speed <output>{params.speed.toFixed(2)}×</output>
          </span>
          <input
            id={ids.speed}
            type="range"
            className="slider"
            {...SPEED_RANGE}
            value={params.speed}
            onChange={(e) => onParams({ speed: Number(e.target.value) })}
          />
        </label>
        <label className="field" htmlFor={ids.duration}>
          <span className="field-label">
            Duration <output>{duration.toFixed(1)}s</output>
          </span>
          <input
            id={ids.duration}
            type="range"
            className="slider"
            {...DURATION_RANGE}
            value={duration}
            onChange={(e) => onDuration(Number(e.target.value))}
          />
        </label>
      </Section>
      </fieldset>
    </aside>
  )
})
