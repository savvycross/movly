import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { Preview } from './components/Preview'
import { Transport } from './components/Transport'
import { ExportDialog } from './components/ExportDialog'
import { usePlayback } from './usePlayback'
import {
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
  const stage = useMemo(() => getStage(aspect, duration, params.speed), [aspect, duration, params.speed])
  const frames = totalFrames(duration)
  const { frame, playing, toggle, seek, pause } = usePlayback(frames, loop)

  const seekRef = useRef(seek)
  seekRef.current = seek

  const selectTemplate = useCallback((id: string) => {
    setTemplateId(id)
    setDuration(getTemplate(id).defaultDuration)
    seekRef.current(0)
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

  // Space toggles playback (unless the user is typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (exportOpen || e.code !== 'Space' || target.closest('input, textarea, select, button, [contenteditable], dialog'))
        return
      e.preventDefault()
      toggle()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle, exportOpen])

  return (
    <div className="app">
      <Header />
      <div className="workspace">
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
        />
        <main className="stage-area">
          <Preview template={template} params={fullParams} stage={stage} time={frameToTime(frame, params.speed)} />
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
