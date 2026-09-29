import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { Sidebar } from './components/Sidebar'
import { Preview } from './components/Preview'
import { Transport } from './components/Transport'
import { ExportDialog } from './components/ExportDialog'
import { usePlayback } from './usePlayback'
import {
  FPS,
  frameToTime,
  getStage,
  totalFrames,
  type AspectRatio,
  type TemplateColors,
  type TemplateParams,
} from './engine'
import { TEMPLATES, getTemplate } from './templates'
import { loadSettings, saveSettings } from './settings'
import { setThumbsPaused } from './thumbClock'
import { withHeadlinePlaceholder } from './limits'
import type { Suggestion } from './describe/match'

const DEFAULT_TEXT = {
  headline: 'Make it move',
  subline: 'Motion graphics, right in your browser',
}

export default function App() {
  // Last session's settings (validated); anything missing falls back to defaults.
  const [saved] = useState(() => loadSettings(TEMPLATES.map((t) => t.id)))
  const [templateId, setTemplateId] = useState(saved.templateId ?? TEMPLATES[0].id)
  const template = getTemplate(templateId)
  const [aspect, setAspect] = useState<AspectRatio>(saved.aspect ?? '16:9')
  const [duration, setDuration] = useState(saved.duration ?? template.defaultDuration)
  // Once the user picks colors they stick across template switches.
  const [customColors, setCustomColors] = useState<TemplateColors | null>(saved.colors ?? null)
  // The logo is intentionally never persisted.
  const [logo, setLogo] = useState<{ image: HTMLImageElement; name: string; url: string } | null>(null)
  const [params, setParams] = useState<Omit<TemplateParams, 'colors' | 'logo'>>(() => ({
    headline: saved.headline ?? DEFAULT_TEXT.headline,
    subline: saved.subline ?? DEFAULT_TEXT.subline,
    font: saved.font ?? 'Inter',
    speed: saved.speed ?? 1,
  }))
  const [loop, setLoop] = useState(true)
  const [exportOpen, setExportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Remember settings (debounced so typing doesn't write on every keystroke).
  useEffect(() => {
    const id = setTimeout(
      () =>
        saveSettings({
          templateId,
          headline: params.headline,
          subline: params.subline,
          colors: customColors,
          font: params.font,
          aspect,
          speed: params.speed,
          duration,
        }),
      250,
    )
    return () => clearTimeout(id)
  }, [templateId, params, customColors, aspect, duration])

  const fullParams = useMemo<TemplateParams>(
    () => ({ ...params, colors: customColors ?? template.defaultColors, logo: logo?.image ?? null }),
    [params, customColors, template, logo],
  )
  // What gets drawn: same as fullParams but never with an empty headline.
  const renderParams = useMemo(() => withHeadlinePlaceholder(fullParams), [fullParams])
  const stage = useMemo(() => getStage(aspect, duration, params.speed), [aspect, duration, params.speed])
  const frames = totalFrames(duration)
  // Autoplay so the first thing people see is motion; with reduced motion, show a
  // settled "poster" frame instead of the (often empty) first frame.
  const [reduceMotion] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  const { frame, playing, toggle, seek, pause, play } = usePlayback(frames, loop, {
    autoplay: !reduceMotion,
    initialFrame: reduceMotion ? Math.floor(frames * 0.62) : 0,
  })
  /** Show a newly chosen look from the top (or its poster frame with reduced motion). */
  const restartPreview = useCallback(
    (durationSeconds: number) => {
      if (reduceMotion) seekRef.current(Math.floor(totalFrames(durationSeconds) * 0.62))
      else {
        seekRef.current(0)
        play()
      }
    },
    [reduceMotion, play],
  )
  const restartRef = useRef(restartPreview)
  restartRef.current = restartPreview

  const seekRef = useRef(seek)
  seekRef.current = seek
  const frameRef = useRef(frame)
  frameRef.current = frame

  const selectTemplate = useCallback((id: string) => {
    setTemplateId(id)
    setDuration(getTemplate(id).defaultDuration)
    restartRef.current(getTemplate(id).defaultDuration)
  }, [])

  /** Applies a "Describe it" suggestion. Anything the description didn't mention keeps its current value. */
  const applySuggestion = useCallback((s: Suggestion) => {
    setTemplateId(s.templateId)
    setDuration(getTemplate(s.templateId).defaultDuration)
    if (s.colors) setCustomColors(s.colors)
    if (s.aspect) setAspect(s.aspect)
    setParams((p) => ({
      ...p,
      headline: s.headline ?? p.headline,
      subline: s.subline ?? p.subline,
      font: s.font ?? p.font,
      speed: s.speed ?? p.speed,
    }))
    restartRef.current(getTemplate(s.templateId).defaultDuration)
  }, [])

  const startCreating = useCallback(() => {
    document.getElementById('editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    document.querySelector<HTMLTextAreaElement>('.describe-input')?.focus({ preventScroll: true })
  }, [])

  const patchParams = useCallback((patch: Partial<TemplateParams>) => setParams((p) => ({ ...p, ...patch })), [])
  const resetColors = useCallback(() => setCustomColors(null), [])

  const onLogoFile = useCallback((file: File | null) => {
    if (!file) {
      setLogo(null)
      return
    }
    // Decode locally; nothing leaves the browser.
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.src = url
    image
      .decode()
      .then(() => setLogo({ image, name: file.name, url }))
      .catch(() => URL.revokeObjectURL(url))
  }, [])

  // Free the previous logo's object URL when it's replaced or removed.
  useEffect(() => {
    return () => {
      if (logo) URL.revokeObjectURL(logo.url)
    }
  }, [logo])

  const openExport = useCallback(() => {
    pause()
    setExportOpen(true)
  }, [pause])

  // Freeze thumbnails while the dialog is open so exports get the CPU.
  useEffect(() => setThumbsPaused(exportOpen), [exportOpen])

  // Keyboard: Space = play/pause, ←/→ = step a frame (Shift: one second).
  // Works everywhere except while typing in a text field or with the export dialog open.
  useEffect(() => {
    const isTyping = (t: EventTarget | null) => {
      if (!(t instanceof HTMLElement)) return false
      if (t.closest('textarea, select, [contenteditable], dialog')) return true
      return t instanceof HTMLInputElement && !['range', 'checkbox', 'radio', 'color', 'file', 'button'].includes(t.type)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (exportOpen || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return
      if (e.code === 'Space') {
        // Also stops a focused button from being "clicked" and the page from scrolling.
        e.preventDefault()
        if (!e.repeat) toggle()
      } else if ((e.code === 'ArrowLeft' || e.code === 'ArrowRight') && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault()
        const step = (e.shiftKey ? FPS : 1) * (e.code === 'ArrowLeft' ? -1 : 1)
        pause()
        seekRef.current(frameRef.current + step)
      }
    }
    // Buttons activate on Space *keyup*, so swallow that too.
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !exportOpen && !isTyping(e.target)) e.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [toggle, pause, exportOpen])

  return (
    <div className="app">
      <Header />
      <Hero onStart={startCreating} />
      <div className="workspace" id="editor">
        <Sidebar
          templates={TEMPLATES}
          selectedId={template.id}
          onSelectTemplate={selectTemplate}
          aspect={aspect}
          onAspect={setAspect}
          params={fullParams}
          onParams={patchParams}
          customColors={customColors}
          onColors={setCustomColors}
          onResetColors={resetColors}
          logoName={logo?.name ?? null}
          onLogoFile={onLogoFile}
          duration={duration}
          onDuration={setDuration}
          disabled={exportOpen}
          onApplySuggestion={applySuggestion}
        />
        <main className="stage-area">
          <Preview template={template} params={renderParams} stage={stage} time={frameToTime(frame, params.speed)} />
          <Transport
            frame={frame}
            totalFrames={frames}
            playing={playing}
            loop={loop}
            onToggle={toggle}
            onToggleLoop={() => setLoop((l) => !l)}
            onSeek={seek}
            onDownload={openExport}
            disabled={exportOpen}
          />
        </main>
      </div>
      <ExportDialog
        open={exportOpen}
        comp={{ template, params: fullParams, aspect, duration }}
        onClose={() => !exporting && setExportOpen(false)}
        onBusyChange={setExporting}
      />
    </div>
  )
}
