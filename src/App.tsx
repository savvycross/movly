import { useEffect, useMemo, useState } from 'react'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { Preview } from './components/Preview'
import { Transport } from './components/Transport'
import { usePlayback } from './usePlayback'
import { frameToTime, totalFrames, type TemplateParams } from './engine'
import { TEMPLATES, getTemplate } from './templates'

const DEFAULT_TEXT = {
  headline: 'Make it move',
  subline: 'Motion graphics, right in your browser',
}

export default function App() {
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id)
  const template = getTemplate(templateId)
  const [params, setParams] = useState<TemplateParams>(() => ({
    ...DEFAULT_TEXT,
    colors: template.defaultColors,
    font: 'Inter',
    logo: null,
    speed: 1,
  }))
  const [loop, setLoop] = useState(true)

  const frames = useMemo(() => totalFrames(template, params.speed), [template, params.speed])
  const { frame, playing, toggle, seek } = usePlayback(frames, loop)

  const selectTemplate = (id: string) => {
    setTemplateId(id)
    setParams((p) => ({ ...p, colors: getTemplate(id).defaultColors }))
    seek(0)
  }

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
        <Sidebar templates={TEMPLATES} selectedId={template.id} onSelect={selectTemplate} />
        <main className="stage-area">
          <Preview template={template} params={params} time={frameToTime(frame, params.speed)} />
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
