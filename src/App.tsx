import { useEffect } from 'react'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { Preview } from './components/Preview'
import { Transport } from './components/Transport'
import { usePlayback } from './usePlayback'
import { DEFAULT_DURATION_SECONDS, FPS } from './timing'

const TOTAL_FRAMES = DEFAULT_DURATION_SECONDS * FPS

export default function App() {
  const { frame, playing, toggle, seek } = usePlayback(TOTAL_FRAMES)

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
        <Sidebar />
        <main className="stage-area">
          <Preview frame={frame} totalFrames={TOTAL_FRAMES} />
          <Transport
            frame={frame}
            totalFrames={TOTAL_FRAMES}
            playing={playing}
            onToggle={toggle}
            onSeek={seek}
            // onDownload is wired up once in-browser video export lands.
          />
        </main>
      </div>
    </div>
  )
}
