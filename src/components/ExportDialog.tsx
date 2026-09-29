import { useEffect, useMemo, useRef, useState } from 'react'
import { getStage } from '../engine'
import {
  describePlan,
  detectVideoPlan,
  exportFps,
  exportFrameCount,
  exportSize,
  runExport,
  type Composition,
  type ExportFormat,
  type ExportQuality,
  type ExportResult,
  type VideoPlan,
} from '../export'

interface ExportDialogProps {
  open: boolean
  comp: Composition
  onClose: () => void
  /** Called with true while an export is running. */
  onBusyChange: (busy: boolean) => void
}

type Phase =
  | { kind: 'setup' }
  | { kind: 'running'; progress: number }
  | { kind: 'done'; result: ExportResult; url: string }
  | { kind: 'error'; message: string }

const isIOS = () =>
  /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

const formatBytes = (n: number) => (n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`)

export function ExportDialog({ open, comp, onClose, onBusyChange }: ExportDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const [format, setFormat] = useState<ExportFormat>('video')
  const [quality, setQuality] = useState<ExportQuality>('1080p')
  const [plan, setPlan] = useState<VideoPlan | null | 'detecting'>('detecting')
  const [phase, setPhase] = useState<Phase>({ kind: 'setup' })

  const stage = getStage(comp.aspect, comp.duration, comp.params.speed)
  const size = exportSize(stage, format, quality)
  const videoSize = exportSize(stage, 'video', quality)
  const frames = exportFrameCount(comp.duration, format)
  const running = phase.kind === 'running'

  useEffect(() => {
    const d = dialogRef.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  // Re-detect the best video encoder for this size whenever the dialog opens or size changes.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setPlan('detecting')
    detectVideoPlan(videoSize.width, videoSize.height)
      .then((p) => !cancelled && setPlan(p))
      .catch(() => !cancelled && setPlan(null))
    return () => {
      cancelled = true
    }
  }, [open, videoSize.width, videoSize.height])

  useEffect(() => {
    if (plan === null) setFormat('gif')
  }, [plan])

  // Free the file's object URL when a result is replaced or the dialog unmounts.
  const doneUrl = phase.kind === 'done' ? phase.url : null
  useEffect(() => () => void (doneUrl && URL.revokeObjectURL(doneUrl)), [doneUrl])

  const file = useMemo(
    () => (phase.kind === 'done' ? new File([phase.result.blob], phase.result.fileName, { type: phase.result.blob.type }) : null),
    [phase],
  )
  const canShare = !!file && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })

  const start = async () => {
    const controller = new AbortController()
    abortRef.current = controller
    onBusyChange(true)
    setPhase({ kind: 'running', progress: 0 })
    // Keep phones awake during long exports (best effort).
    const wakeLock = await navigator.wakeLock?.request('screen').catch(() => null)
    let lastPaint = 0
    try {
      const result = await runExport({
        comp,
        format,
        quality,
        plan: format === 'video' && plan !== 'detecting' ? plan : undefined,
        signal: controller.signal,
        onProgress: (progress) => {
          const now = performance.now()
          if (progress < 1 && now - lastPaint < 50) return
          lastPaint = now
          setPhase({ kind: 'running', progress })
        },
      })
      setPhase({ kind: 'done', result, url: URL.createObjectURL(result.blob) })
    } catch (err) {
      if (controller.signal.aborted) setPhase({ kind: 'setup' })
      else setPhase({ kind: 'error', message: err instanceof Error ? err.message : String(err) })
    } finally {
      abortRef.current = null
      wakeLock?.release().catch(() => {})
      onBusyChange(false)
    }
  }

  const cancel = () => abortRef.current?.abort()
  const close = () => {
    cancel()
    setPhase({ kind: 'setup' })
    onClose()
  }

  const videoLabel = plan === 'detecting' ? 'Checking…' : plan ? describePlan(plan) : 'Not supported here'

  return (
    <dialog
      ref={dialogRef}
      className="export-dialog"
      aria-labelledby="export-title"
      onCancel={(e) => {
        // Esc: cancel a running export first instead of hiding it.
        e.preventDefault()
        if (running) cancel()
        else close()
      }}
    >
      <div className="export-head">
        <h2 id="export-title">Export</h2>
        {!running && (
          <button type="button" className="btn-close" onClick={close} aria-label="Close">
            ×
          </button>
        )}
      </div>

      {phase.kind === 'setup' && (
        <>
          <div className="field">
            <span className="field-label">Format</span>
            <div className="segmented two" role="radiogroup" aria-label="Format">
              <button
                type="button"
                role="radio"
                className="seg"
                aria-checked={format === 'video'}
                disabled={plan === null}
                onClick={() => setFormat('video')}
              >
                <strong>Video</strong>
                <span className="seg-sub">{videoLabel}</span>
              </button>
              <button type="button" role="radio" className="seg" aria-checked={format === 'gif'} onClick={() => setFormat('gif')}>
                <strong>GIF</strong>
                <span className="seg-sub">≤720px · 15 fps</span>
              </button>
            </div>
          </div>
          <div className="field">
            <span className="field-label">Quality</span>
            <div className="segmented two" role="radiogroup" aria-label="Quality">
              {(['720p', '1080p'] as const).map((q) => (
                <button
                  key={q}
                  type="button"
                  role="radio"
                  className="seg"
                  aria-checked={quality === q}
                  disabled={format === 'gif'}
                  onClick={() => setQuality(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
          <p className="export-summary">
            {size.width}×{size.height} · {exportFps(format)} fps · {frames} frames · {comp.duration.toFixed(1)}s
          </p>
          {format === 'gif' && <p className="hint">GIFs use 256 colors, so soft gradients may band. Use video for best quality.</p>}
          {format === 'video' && plan && plan !== 'detecting' && plan.method === 'mediarecorder' && (
            <p className="hint">
              This browser records in real time, so keep this tab open and visible. On slow devices a few frames may be
              dropped.
            </p>
          )}
          {format === 'video' && plan && plan !== 'detecting' && plan.container === 'webm' && (
            <p className="hint">This browser can't encode MP4 (H.264), so you'll get WebM. Chrome, Edge and Safari export MP4.</p>
          )}
          <div className="export-actions">
            <button type="button" className="btn-secondary" onClick={close}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={start}
              disabled={format === 'video' && (plan === 'detecting' || plan === null)}
            >
              Export
            </button>
          </div>
        </>
      )}

      {phase.kind === 'running' && (
        <>
          <p className="export-status">
            Rendering {format === 'gif' ? 'GIF' : 'video'}… {Math.round(phase.progress * 100)}%
          </p>
          <progress className="export-progress" value={phase.progress} max={1} aria-label="Export progress" />
          <p className="hint">Rendering every frame on this device. Nothing is uploaded.</p>
          <div className="export-actions">
            <button type="button" className="btn-secondary" onClick={cancel}>
              Cancel export
            </button>
          </div>
        </>
      )}

      {phase.kind === 'done' && (
        <>
          <p className="export-status">Ready!</p>
          <p className="export-summary">
            <span className="export-file">{phase.result.fileName}</span>
            <br />
            {phase.result.width}×{phase.result.height} · {phase.result.frames} frames · {formatBytes(phase.result.blob.size)}
          </p>
          {canShare && isIOS() && <p className="hint">On iPhone, tap Share → Save Video (or Save Image) to add it to Photos.</p>}
          <div className="export-actions">
            <button type="button" className="btn-secondary" onClick={() => setPhase({ kind: 'setup' })}>
              Export another
            </button>
            {canShare && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => navigator.share({ files: [file!], title: phase.result.fileName }).catch(() => {})}
              >
                Share
              </button>
            )}
            <a className="btn-primary" href={phase.url} download={phase.result.fileName}>
              Download
            </a>
          </div>
        </>
      )}

      {phase.kind === 'error' && (
        <>
          <p className="export-status error">Export failed</p>
          <p className="hint">{phase.message}</p>
          <div className="export-actions">
            <button type="button" className="btn-secondary" onClick={() => setPhase({ kind: 'setup' })}>
              Back
            </button>
          </div>
        </>
      )}
    </dialog>
  )
}
