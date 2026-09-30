import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { loadFont, renderFrame, type StageInfo, type Template, type TemplateParams } from '../engine'

interface PreviewProps {
  template: Template
  params: TemplateParams
  stage: StageInfo
  /** Speed-adjusted template time in seconds. */
  time: number
  /** When set, shows a "tap for sound" button (autoplay is always muted by browsers). */
  onEnableSound?: () => void
}

export function Preview({ template, params, stage, time, onEnableSound }: PreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [cssWidth, setCssWidth] = useState(0)
  const [fontVersion, setFontVersion] = useState(0)
  // Only show the loading pill if the font takes a noticeable moment (avoids flashes when cached).
  const [fontLoading, setFontLoading] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ro = new ResizeObserver(([entry]) => setCssWidth(entry.contentRect.width))
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [])

  // Canvas won't fetch web fonts itself; re-render once the chosen family is ready.
  useEffect(() => {
    let cancelled = false
    const slow = setTimeout(() => !cancelled && setFontLoading(true), 150)
    loadFont(params.font).then(() => {
      clearTimeout(slow)
      if (cancelled) return
      setFontLoading(false)
      setFontVersion((v) => v + 1)
    })
    return () => {
      cancelled = true
      clearTimeout(slow)
    }
  }, [params.font])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !cssWidth) return
    // Backing store = on-screen size × DPR, capped at the stage resolution.
    const dpr = window.devicePixelRatio || 1
    const width = Math.min(stage.width, Math.round(cssWidth * dpr))
    const height = Math.round((width * stage.height) / stage.width)
    if (canvas.width !== width) canvas.width = width
    if (canvas.height !== height) canvas.height = height
    renderFrame(ctx, template, time, params, stage)
  }, [template, params, stage, time, cssWidth, fontVersion])

  const style = { '--arw': stage.width, '--arh': stage.height } as CSSProperties
  return (
    <div className="preview">
      <div className="canvas" style={style}>
        <canvas ref={canvasRef} aria-label={`${template.name} preview`} />
        {onEnableSound && (
          <button type="button" className="sound-pill" onClick={onEnableSound}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 9v6h4l5 4V5L8 9H4Zm12.5 3a4.5 4.5 0 0 0-2-3.7v7.4a4.5 4.5 0 0 0 2-3.7ZM14.5 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6Z" />
            </svg>
            Tap for sound
          </button>
        )}
        <div className={`font-loading${fontLoading ? ' visible' : ''}`} role="status" aria-live="polite">
          {fontLoading && (
            <>
              <span className="spinner" aria-hidden="true" />
              Loading {params.font}…
            </>
          )}
        </div>
      </div>
    </div>
  )
}
