interface PreviewProps {
  frame: number
  totalFrames: number
}

export function Preview({ frame, totalFrames }: PreviewProps) {
  const progress = totalFrames > 1 ? frame / (totalFrames - 1) : 0
  return (
    <div className="preview">
      <div className="canvas" role="img" aria-label="Animation preview">
        <div className="canvas-empty">
          <span className="canvas-empty-title">No template selected</span>
          <span className="canvas-empty-sub">Pick a template to get started</span>
        </div>
        <div className="canvas-progress" style={{ transform: `scaleX(${progress})` }} />
      </div>
    </div>
  )
}
