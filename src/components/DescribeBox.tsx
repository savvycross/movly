import { useEffect, useId, useMemo, useState } from 'react'
import { ASPECT_RATIOS, type AspectRatio, type TemplateColors, type TemplateParams } from '../engine'
import { suggest, type Suggestion } from '../describe/match'
import { getTemplate } from '../templates'
import { TemplateThumb } from './TemplateThumb'

interface DescribeBoxProps {
  params: TemplateParams
  aspect: AspectRatio
  customColors: TemplateColors | null
  onApply: (suggestion: Suggestion) => void
}

const EXAMPLES = ['gold logo reveal for my bakery, elegant', 'hype countdown for my stream', 'neon party promo for TikTok']

/** Free-text → 3 ranked template suggestions, matched locally (no network). */
export function DescribeBox({ params, aspect, customColors, onApply }: DescribeBoxProps) {
  const id = useId()
  const [text, setText] = useState('')
  const [query, setQuery] = useState('')

  // Light debounce so previews don't churn on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setQuery(text.trim()), 180)
    return () => clearTimeout(t)
  }, [text])

  const suggestions = useMemo(() => (query.length >= 2 ? suggest(query) : []), [query])

  return (
    <div className="describe">
      <label htmlFor={id} className="visually-hidden">
        Describe your video
      </label>
      <textarea
        id={id}
        className="input describe-input"
        rows={2}
        maxLength={200}
        value={text}
        placeholder="e.g. gold logo reveal for my bakery, elegant"
        onChange={(e) => setText(e.target.value)}
      />
      {suggestions.length === 0 ? (
        <div className="chips" aria-label="Examples">
          {EXAMPLES.map((ex) => (
            <button key={ex} type="button" className="chip" onClick={() => setText(ex)}>
              {ex}
            </button>
          ))}
        </div>
      ) : (
        <div className="suggestions" role="list" aria-label="Suggestions">
          {suggestions.map((s, i) => {
            const template = getTemplate(s.templateId)
            const stage = ASPECT_RATIOS[s.aspect ?? aspect]
            const thumbParams: TemplateParams = {
              ...params,
              headline: s.headline ?? params.headline,
              subline: s.subline ?? params.subline,
              font: s.font ?? params.font,
              colors: s.colors ?? customColors ?? template.defaultColors,
            }
            return (
              <button
                key={`${s.templateId}-${i}`}
                type="button"
                role="listitem"
                className="suggestion"
                onClick={() => onApply(s)}
                title={`Use ${template.name}`}
              >
                <span
                  className="thumb"
                  style={{ ['--arw' as string]: stage.width, ['--arh' as string]: stage.height }}
                >
                  <TemplateThumb template={template} stage={stage} params={thumbParams} />
                </span>
                <span className="suggestion-name">
                  {i === 0 && <span className="best">Best</span>}
                  {template.name}
                </span>
              </button>
            )
          })}
          {suggestions[0].tags.length > 0 && <p className="hint describe-tags">{suggestions[0].tags.join(' · ')}</p>}
        </div>
      )}
    </div>
  )
}
