import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { loadFont, renderFrame, type StageInfo, type Template, type TemplateParams } from '../engine'

interface PreviewProps {
  template: Template
  params: TemplateParams
  stage: StageInfo
  /** Speed-adjusted template time in seconds. */
  time: number
}

export function Preview({ template, params, stage, time }: PreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [cssWidth, setCssWidth] = useState(0)
  const [fontVersion, setFontVersion] = useState(0)

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
    loadFont(params.font).then(() => !cancelled && setFontVersion((v) => v + 1))
    return () => {
      cancelled = true
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
      </div>
    </div>
  )
}
