import { useId, type ChangeEvent } from 'react'
import { BEAT_STYLES, type AudioSettings, type MusicChoice } from '../audio/types'

export interface UploadInfo {
  name: string
  /** Track length, seconds. */
  length: number
  offset: number
}

interface SoundControlsProps {
  audio: AudioSettings
  onAudio: (patch: Partial<AudioSettings>) => void
  upload: UploadInfo | null
  uploadError: string | null
  onUploadFile: (file: File | null) => void
  onUploadOffset: (seconds: number) => void
  /** Clip length, to bound the start offset. */
  duration: number
}

const LABEL: Record<Exclude<MusicChoice, 'upload'>, string> = {
  none: 'None',
  chill: 'Chill',
  hype: 'Hype',
  corporate: 'Corporate',
  minimal: 'Minimal',
}

const pct = (v: number) => `${Math.round(v * 100)}%`

export function SoundControls({ audio, onAudio, upload, uploadError, onUploadFile, onUploadOffset, duration }: SoundControlsProps) {
  const ids = { sfx: useId(), music: useId(), offset: useId(), file: useId(), rights: useId() }
  const maxOffset = upload ? Math.max(0, upload.length - duration) : 0
  const off = !audio.enabled

  return (
    <div className="sound">
      <label className="switch">
        <input type="checkbox" role="switch" checked={audio.enabled} onChange={(e) => onAudio({ enabled: e.target.checked })} />
        <span className="switch-track" aria-hidden="true" />
        <span>Sound {audio.enabled ? 'on' : 'off'}</span>
      </label>

      <fieldset className="sound-body" disabled={off}>
        <label className="field" htmlFor={ids.sfx}>
          <span className="field-label">
            Effects volume <output>{pct(audio.sfxVolume)}</output>
          </span>
          <input
            id={ids.sfx}
            type="range"
            className="slider"
            min={0}
            max={1}
            step={0.05}
            value={audio.sfxVolume}
            onChange={(e) => onAudio({ sfxVolume: Number(e.target.value) })}
          />
        </label>

        <div className="field">
          <span className="field-label">Music</span>
          <div className="segmented music-grid" role="radiogroup" aria-label="Music">
            {(['none', ...BEAT_STYLES] as const).map((m) => (
              <button key={m} type="button" role="radio" className="seg" aria-checked={audio.music === m} onClick={() => onAudio({ music: m })}>
                {LABEL[m]}
              </button>
            ))}
            <button
              type="button"
              role="radio"
              className="seg"
              aria-checked={audio.music === 'upload'}
              disabled={!upload}
              title={upload ? upload.name : 'Upload a track first'}
              onClick={() => onAudio({ music: 'upload' })}
            >
              Uploaded
            </button>
          </div>
        </div>

        <label className="field" htmlFor={ids.music}>
          <span className="field-label">
            Music volume <output>{pct(audio.musicVolume)}</output>
          </span>
          <input
            id={ids.music}
            type="range"
            className="slider"
            min={0}
            max={1}
            step={0.05}
            value={audio.musicVolume}
            onChange={(e) => onAudio({ musicVolume: Number(e.target.value) })}
          />
        </label>

        <div className="field">
          <span className="field-label">Your own track</span>
          <div className="logo-row">
            <label className="file-btn" htmlFor={ids.file}>
              {upload ? 'Replace audio' : 'Upload audio'}
            </label>
            <input
              id={ids.file}
              type="file"
              accept=".mp3,.m4a,.wav,audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/x-wav"
              className="visually-hidden"
              aria-describedby={ids.rights}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                onUploadFile(e.target.files?.[0] ?? null)
                e.target.value = ''
              }}
            />
            {upload && (
              <>
                <span className="logo-name" title={upload.name}>
                  {upload.name}
                </span>
                <button type="button" className="link-btn" onClick={() => onUploadFile(null)}>
                  Remove
                </button>
              </>
            )}
          </div>
          {uploadError && <span className="field-hint">{uploadError}</span>}
          {upload && (
            <label className="field offset-field" htmlFor={ids.offset}>
              <span className="field-label">
                Start at <output>{upload.offset.toFixed(1)}s</output>
              </span>
              <input
                id={ids.offset}
                type="range"
                className="slider"
                min={0}
                max={maxOffset}
                step={0.1}
                value={Math.min(upload.offset, maxOffset)}
                disabled={maxOffset <= 0}
                onChange={(e) => onUploadOffset(Number(e.target.value))}
              />
            </label>
          )}
          <p id={ids.rights} className="hint">
            Only upload music you own or have the rights to use. It's trimmed to the video with a 0.5s fade-out, stays on
            your device and is never saved.
          </p>
        </div>
      </fieldset>
      <p className="hint">Sound plays in the preview after you press play.</p>
    </div>
  )
}
