interface HeroProps {
  onStart: () => void
}

/** Short landing intro above the editor. Kept compact so the editor stays in view on desktop. */
export function Hero({ onStart }: HeroProps) {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <h1 id="hero-title">Turn any text into a scroll-stopping animation.</h1>
        <p>Free motion graphics in your browser. No signup, no watermark unless you want one.</p>
      </div>
      <button type="button" className="btn-primary hero-cta" onClick={onStart}>
        Start creating
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14m0 0-6-6m6 6 6-6" />
        </svg>
      </button>
    </section>
  )
}
