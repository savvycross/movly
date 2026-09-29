import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { Preview } from './components/Preview'
import { Transport } from './components/Transport'
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

const DEFAULT_TEXT = {
  headline: 'Make it move',
  subline: 'Motion graphics, right in your browser',
}

export default function App() {
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id)
  const template = getTemplate(templateId)
  const [aspect, setAspect] = useState<AspectRatio>('16:9')
  const [duration, setDuration] = useState(template.defaultDuration)
  // Once the user picks colors they stick across template switches.
  const [customColors, setCustomColors] = useState<TemplateColors | null>(null)
  const [logo, setLogo] = useState<{ image: HTMLImageElement; name: string; url: string } | null>(null)
  const [params, setParams] = useState<Omit<TemplateParams, 'colors' | 'logo'>>(() => ({
    ...DEFAULT_TEXT,
    font: 'Inter',
    speed: 1,
  }))
  const [loop, setLoop] = useState(true)

  const fullParams = useMemo<TemplateParams>(
    () => ({ ...params, colors: customColors ?? template.defaultColors, logo: logo?.image ?? null }),
    [params, customColors, template, logo],
  )
  const stage = useMemo(() => getStage(aspect, duration, params.speed), [aspect, duration, params.speed])
  const frames = totalFrames(duration)
  const { frame, playing, toggle, seek } = usePlayback(frames, loop)

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

  // Space toggles playback (unless the user is typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (e.code !== 'Space' || target.closest('input, textarea, select, button, [contenteditable]')) return
      e.preventDefault()
      toggle()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle])

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
            // onDownload is wired up once in-browser video export lands.
          />
        </main>
      </div>
    </div>
  )
}
