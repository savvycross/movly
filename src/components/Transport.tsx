import { FPS, formatTimecode } from '../engine'

interface TransportProps {
  frame: number
  totalFrames: number
  playing: boolean
  loop: boolean
  onToggle: () => void
  onToggleLoop: () => void
  onSeek: (frame: number) => void
  /** Omitted until the export pipeline exists; the button renders disabled. */
  onDownload?: () => void
}

export function Transport({
  frame,
  totalFrames,
  playing,
  loop,
  onToggle,
  onToggleLoop,
  onSeek,
  onDownload,
}: TransportProps) {
  const lastFrame = totalFrames - 1
  const pct = lastFrame > 0 ? (frame / lastFrame) * 100 : 0

  return (
    <div className="transport">
      <button
        type="button"
        className="btn-icon"
        onClick={onToggle}
        aria-label={playing ? 'Pause' : 'Play'}
        title={playing ? 'Pause (Space)' : 'Play (Space)'}
      >
        {playing ? (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
          </svg>
        )}
      </button>

      <button
        type="button"
        className="btn-toggle"
        onClick={onToggleLoop}
        aria-pressed={loop}
        aria-label="Loop"
        title={loop ? 'Loop on' : 'Loop off'}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4" />
        </svg>
      </button>

      <input
        className="scrubber"
        type="range"
        min={0}
        max={lastFrame}
        step={1}
        value={frame}
        onChange={(e) => onSeek(Number(e.target.value))}
        aria-label="Timeline"
        aria-valuetext={`${formatTimecode(frame)} of ${formatTimecode(totalFrames)}`}
        style={{ ['--pct' as string]: `${pct}%` }}
      />

      <div className="timecode" title={`seconds:frames @ ${FPS}fps`}>
        <span className="timecode-current">{formatTimecode(frame)}</span>
        <span className="timecode-sep">/</span>
        <span>{formatTimecode(totalFrames)}</span>
      </div>

      <button
        type="button"
        className="btn-primary"
        onClick={onDownload}
        disabled={!onDownload}
        title={onDownload ? 'Download video' : 'Video export is coming soon'}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19h14" />
        </svg>
        <span>Download</span>
      </button>
    </div>
  )
}
