import { useEffect, useRef, useState } from 'react'
import { STAGE, loadFont, renderFrame, type Template, type TemplateParams } from '../engine'

interface PreviewProps {
  template: Template
  params: TemplateParams
  /** Speed-adjusted template time in seconds. */
  time: number
}

export function Preview({ template, params, time }: PreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [fontVersion, setFontVersion] = useState(0)

  // Match the canvas backing store to its on-screen size × devicePixelRatio,
  // capped at the stage resolution (more pixels than export gains nothing).
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ro = new ResizeObserver(([entry]) => {
      const dpr = window.devicePixelRatio || 1
      const width = Math.min(STAGE.width, Math.round(entry.contentRect.width * dpr))
      const height = Math.round((width * STAGE.height) / STAGE.width)
      setSize((s) => (s.width === width && s.height === height ? s : { width, height }))
    })
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
    if (!canvas || !ctx || !size.width) return
    if (canvas.width !== size.width) canvas.width = size.width
    if (canvas.height !== size.height) canvas.height = size.height
    renderFrame(ctx, template, time, params)
  }, [template, params, time, size, fontVersion])

  return (
    <div className="preview">
      <div className="canvas">
        <canvas ref={canvasRef} aria-label={`${template.name} preview`} />
      </div>
    </div>
  )
}
