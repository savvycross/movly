import { useEffect, useRef } from 'react'
import { renderFrame, type StageInfo, type Template, type TemplateParams } from '../engine'
import { subscribeThumbClock } from '../thumbClock'

interface TemplateThumbProps {
  template: Template
  params: TemplateParams
  stage: Pick<StageInfo, 'width' | 'height'>
}

const THUMB_PX = 220

/** Small looping preview of a template. Only animates while on screen. */
export function TemplateThumb({ template, params, stage }: TemplateThumbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Latest props for the animation loop without resubscribing on every change.
  const latest = useRef({ template, params, stage })
  latest.current = { template, params, stage }

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    const draw = (seconds: number) => {
      const { template: tpl, params: p, stage: s } = latest.current
      const scale = (THUMB_PX * dpr) / Math.max(s.width, s.height)
      const w = Math.round(s.width * scale)
      const h = Math.round(s.height * scale)
      if (canvas.width !== w) canvas.width = w
      if (canvas.height !== h) canvas.height = h
      const duration = tpl.defaultDuration
      // Loop with a short pause on the last frame; reduced motion shows a still.
      const time = reduceMotion ? duration * 0.6 : Math.min(duration, seconds % (duration + 0.6))
      renderFrame(ctx, tpl, time, { ...p, speed: 1 }, { width: s.width, height: s.height, duration })
    }

    draw(performance.now() / 1000)
    if (reduceMotion) return
    let unsubscribe: (() => void) | null = null
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !unsubscribe) unsubscribe = subscribeThumbClock(draw)
      if (!entry.isIntersecting && unsubscribe) {
        unsubscribe()
        unsubscribe = null
      }
    })
    io.observe(canvas)
    return () => {
      io.disconnect()
      unsubscribe?.()
    }
  }, [])

  return <canvas ref={canvasRef} className="thumb-canvas" aria-hidden="true" />
}
