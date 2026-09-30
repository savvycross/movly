# Movly

Movly is a free web app for making short motion graphics. Users pick an
animation template, customize text, colors and logo, preview it, and download
it as a video — all inside the browser.

## The $0 rule (hard requirement)

Movly must cost **$0 to run**. Every change must respect this:

- **No backend.** No servers, serverless functions, databases or edge workers.
  The app is a static site hosted on Vercel's free tier (static files only).
- **No paid APIs or services.** No hosted rendering, transcoding, storage,
  analytics or auth that costs money (or that needs an API key/secret).
- **Everything runs client-side.** Rendering, previewing and video export all
  happen in the user's browser (e.g. Canvas/WebGL, WebCodecs, MediaRecorder,
  or WASM encoders).
- Dependencies must be free/open-source and bundled into the static build or
  loaded from a free public CDN.
- User data (logos, settings) stays in the browser (memory, `localStorage`,
  IndexedDB). Nothing is uploaded anywhere. Fonts come from Google Fonts' free CDN.

If a feature seems to need a server or paid service, find a browser-only
approach or flag it instead of adding one.

## Stack

- **Vite** (dev server + bundler), **React 19**, **TypeScript** (strict)
- Plain CSS with custom properties (`src/index.css`) — dark theme, no CSS framework
- Hosting: **Vercel** (https://movly-gamma.vercel.app/), which builds and deploys
  every push to `main`. GitHub Actions only runs checks (`ci.yml`) and serves a
  redirect from the old GitHub Pages URL (`pages-redirect.yml`).

## Commands

```bash
npm install       # install deps
npm run dev       # local dev server
npm run build     # typecheck (tsc -b) + production build into dist/
npm test          # vitest unit tests (engine helpers, template registry)
npm run preview   # serve the production build locally
npm run share-images  # regenerate public/ share images + brand/ logos (needs Playwright Chromium)
```

## Project layout

```
src/
  main.tsx              # React entry
  App.tsx               # app state: template, aspect, params, duration, colors, logo
  palettes.ts           # 8 ready-made color palettes
  settings.ts           # remember last settings in localStorage (validated; never the logo)
  limits.ts             # input limits, headline placeholder (withHeadlinePlaceholder)
  siteConfig.ts         # validated VITE_* token/social config (hides UI when unset)
  audio/
    types.ts            # AudioSettings, AudioPlan, BeatNote, PlannedSfx
    beats.ts            # 4 generated beat loops (chill, hype, corporate, minimal) as note lists
    plan.ts             # planAudio(): template cues + beat + upload → real-time AudioPlan (pure)
    synth.ts            # Web Audio synthesis: 7 effects, 10 instruments, schedulePlan, offline render
    usePreviewAudio.ts  # preview playback in sync with the playhead (after a user gesture)
    audio.test.ts       # cue timing per template, speed/duration scaling, beats, plan
  describe/
    match.ts            # "Describe it": offline keyword/synonym matcher → ranked suggestions
    match.test.ts       # 26 example phrases + name/aspect/fallback tests
  thumbClock.ts         # one shared rAF loop for all template thumbnails
  usePlayback.ts        # requestAnimationFrame playback clock (frame-based, loop/stop)
  components/
    Header.tsx          # Movly branding
    Hero.tsx            # short landing intro + "Start creating" (scrolls to #editor)
    DescribeBox.tsx     # "Describe it" input, example chips, 3 animated suggestions
    SoundControls.tsx   # sound on/off, effects/music volume, music choice, upload + offset
    Sidebar.tsx         # template grid, format, text, colors, font, logo, timing controls
    TemplateThumb.tsx   # animated mini-preview (only animates while visible)
    Preview.tsx         # <canvas> preview: DPR-aware sizing, font loading, renderFrame
    Transport.tsx       # play/pause, loop, scrubber, SS:FF timecode, Download
    ExportDialog.tsx    # format/quality, progress, cancel, download/share
    TokenSection.tsx    # optional $MOVLY panel below the editor (address, copy, trade, explorer)
    Footer.tsx          # tagline + X / Telegram links (each only if configured)
  export/
    plan.ts             # pure: export sizes, frame counts, file names, codec choice
    capabilities.ts     # probes WebCodecs encoders + MediaRecorder MIME types
    frames.ts           # renders composition frames onto an offscreen export canvas
    video.ts            # WebCodecs + Mediabunny path, MediaRecorder fallback
    gif.ts, gif.worker.ts  # GIF via gifenc in a Web Worker (global palette)
    mediabunny*.ts      # the only Mediabunny import sites (tree-shaken, lazy-loaded)
    watermark.ts        # optional "Made with Movly" corner badge (off by default)
    audioCodec.ts       # AAC (MP4) / Opus (WebM); lazy WASM AAC encoder when not native
    index.ts            # runExport(), detectVideoPlan()
  engine/               # framework-free animation engine (no React imports)
    types.ts            # Template, TemplateParams, StageInfo, TemplateColors
    render.ts           # ASPECT_RATIOS, getStage(), renderFrame()
    layout.ts           # stageLayout(): W, H, U (short side), M (safe margin), safeW/H…
    timing.ts           # FPS (30), totalFrames(), frameToTime(), fitTimeline(), formatTimecode()
    easing.ts           # quad/cubic/expo/back/elastic/bounce In/Out/InOut + linear
    keyframes.ts        # tween() and interpolate() keyframe tracks
    text.ts             # fitLines, fitText, wrapLines, drawRevealText/Lines, fitStagger, measureUnits…
    color.ts            # withAlpha, mixColor, readableOn, contrastRatio, rotateHue
    effects.ts          # setGlow/clearGlow (shadows in stage units)
    image.ts            # drawImageContain (logos)
    fonts.ts            # FONTS list + loadFont() (canvas needs explicit font loading)
    math.ts             # clamp, lerp, mapRange, hash/hash2 (seeded randomness)
  templates/
    index.ts            # TEMPLATES registry (picker order)
    shared.ts           # outro(), stack(), paintBackdrop(), drawLogoBadge()
    *.ts                # one module per template
    mockCanvas.ts       # fake 2D context for tests: records text bounding boxes
    templates.test.ts   # every template × ratio × text: renders cleanly, text stays on stage
```

## Animation engine

- Everything renders on a single `<canvas>` at **30 fps**. Time is tracked in
  frames; `frameToTime(frame, speed)` converts to template seconds.
- **Duration and speed are independent.** The clip is `duration` seconds long
  (`totalFrames(duration)`); speed makes the animation faster/slower inside it.
  Templates receive template time `t ∈ [0, stage.duration]` where
  `stage.duration = duration × speed`.
- `renderFrame` scales the logical stage to the canvas's pixel size (preview at
  screen size × DPR, thumbnails tiny, export at full resolution).
- `draw()` must be a **pure function of `(time, params, stage)`**: no state kept
  between calls, no `Math.random()` (use `hash`/`hash2`), no reliance on the
  previous frame. Scrubbing, looping, thumbnails and export depend on it.

## Aspect ratios — layout rule (important)

Stages: **16:9 = 1920×1080, 1:1 = 1080×1080, 4:5 = 1080×1350, 9:16 = 1080×1920**
(`ASPECT_RATIOS` in `render.ts`). `draw()` receives `stage = { width, height, duration }`.

**Templates must lay out relative to the stage, never with fixed coordinates.**

- Start every `draw()` with `const L = stageLayout(stage)` and size things by
  `L.U` (the shorter side), position them with `L.cx/L.cy`, `L.M` (safe margin),
  `L.safeW/L.safeH`. Branch on `L.portrait` / `L.landscape` only for layout
  choices (e.g. more lines allowed in 9:16).
- **Never size text by hand.** Use `fitLines(ctx, text, maxWidth, maxHeight, …)`,
  which wraps and shrinks until the block fits its box (it always fits).
  Remember the user's text can be 1 word or 60 characters, in any of 5 fonts.
- Keep all text inside the safe margins at rest. Only transitions may move text
  off-stage.
- Shadows/glows: use `setGlow` (canvas shadows ignore the transform).

## Export

- Exports never record the live preview. Every frame is rendered offscreen at
  export resolution with the same deterministic `draw()`, so slow devices
  can't drop frames.
- Video: **MP4/H.264 via WebCodecs** when `canEncodeVideo('avc')` passes,
  otherwise **WebM (VP9/VP8/AV1) via WebCodecs**, muxed with Mediabunny.
  If WebCodecs is missing, fall back to `canvas.captureStream` +
  `MediaRecorder` (real-time, wall-clock timestamps, so frames may drop), then
  remux to fix duration/seek metadata.
- GIF: ≤720px wide, 15fps, one global 256-color palette sampled from 8 frames,
  encoded in a worker. Delays alternate 6/7cs so total duration is exact.
- Sizes: 1080p = full stage (e.g. 1080×1920); 720p = short side 720. Even
  dimensions (H.264 requirement). File name: `movly-<template>-<ratio>.<ext>`.
- Mediabunny is imported only via `src/export/mediabunny*.ts` with named
  exports; import those lazily (`await import('./mediabunny')`) so the library
  stays out of the main bundle.
- Test locally: Playwright's Chromium has no H.264 encoder, so headless tests
  produce WebM; real Chrome/Edge/Safari produce MP4. AAC is tested through the
  WASM encoder (force an MP4 container plan).

## Audio

- **No audio files.** Every effect and beat is synthesized with the Web Audio
  API (`src/audio/synth.ts`), so there's nothing to license. Randomness (noise,
  glitch pitches) is seeded; renders are identical apart from float rounding
  (<1e-6).
- **Templates own their sound design:** `sound(ctx, params, stage)` returns
  `SoundEvent`s in template time, computed from the *same* timing constants and
  layout helpers as `draw()` (e.g. Typewriter reuses `typeTimes`, Kinetic
  Title/Slide Stack share a layout function). Author cues in fitTimeline
  local time and return `cuesToStageTime(cues, stage.duration, defaultDuration)`.
- `planAudio()` turns cues into real seconds (`time / speed`, like frames),
  adds the beat (fixed tempo per style, loops for the clip length) or the
  uploaded track (start offset, trimmed to the clip), volumes, and a 0.5s
  music fade-out. Preview and export both play this one plan, so they match.
- **Preview** audio only starts after a user gesture (play button, Space,
  "Tap for sound"): browsers block audible autoplay. `usePlayback().epoch`
  bumps on play/seek/loop so audio reschedules.
- **Export** renders the plan with `OfflineAudioContext` (48kHz stereo, exact
  clip length) and muxes it with Mediabunny: AAC in MP4, Opus in WebM. If the
  browser can't encode AAC natively, `@mediabunny/aac-encoder` (WASM, lazy) is
  registered. GIFs are always silent (the dialog says so).
- **Uploaded audio is never saved** (not in settings, not anywhere); users are
  told they must own the rights. Saved settings keep only the sound choices,
  and `music: 'upload'` is stored as `'none'`.
- When adding a template, give it a `sound()` and a timing test in
  `audio.test.ts` if its cues follow text (per letter/word/line).

## "Describe it" matcher

`src/describe/match.ts` is deliberately **not** AI: weighted keyword tables
(`TEMPLATE_RULES`, `PALETTE_RULES`, `FONT_RULES`, `SPEED_RULES`,
`ASPECT_RULES`) plus `TOPICS` for default headlines. Weights: 3 = names the
thing, 2 = strong intent, 1 = mood. Plurals match automatically. Headline
priority: quoted text / "called X" > event topic (sale, birthday…) > a
Capitalized business name > topic headline. Anything the text doesn't mention
stays unchanged when a suggestion is applied.

When adding a template, add a `TEMPLATE_RULES` entry for it and at least one
phrase to `match.test.ts`. Tune weights with real phrases, never by
special-casing a test.

## Watermark

"Made with Movly" is **opt-in** (unchecked by default in the export dialog)
and is drawn only on exports (`Composition.watermark`), never in the preview.
It's drawn in canvas pixels after the template so it's the same relative size
at every resolution.

## Share images and meta tags

`index.html` has Open Graph / Twitter tags. Image URLs must be absolute, so
they use `%VITE_SITE_URL%` from `.env` (committed, not a secret; forks change
it). `public/og-image.png` (1200×630) and the icons are rendered from our own
templates by `npm run share-images`; the script refuses to write if Inter
didn't load. Re-run it if the look of Kinetic Title changes.

## Token & community links

Movly is and stays **free and fully usable without the token**. Never gate,
limit, watermark or slow down anything based on the token, and never add
wallet connections, price feeds or trading to the app. The token section is
information only, below the editor.

All of it is configured in `.env` (committed; these are public values, not
secrets) and read at **build time** by `src/siteConfig.ts`:

| Variable | What to put there | Effect when empty |
|---|---|---|
| `VITE_TOKEN_TICKER` | `MOVLY` (shown as `$MOVLY`) | falls back to `MOVLY` |
| `VITE_TOKEN_ADDRESS` | the contract address, `0x` + 40 hex chars | **token section + header link hidden** |
| `VITE_TOKEN_URL` | the launchpad/trade page (https) | no Trade button |
| `VITE_EXPLORER_URL` | explorer base URL; link = `<base>/token/<address>` | no explorer link |
| `VITE_X_URL` | e.g. `https://x.com/<handle>` | no X link in footer |
| `VITE_TELEGRAM_URL` | e.g. `https://t.me/<group>` | no Telegram link in footer |

Invalid values are ignored rather than shown: a malformed address hides the
whole section, and any link that isn't `https://` is dropped.

**After launch:**

1. Copy the contract address from the launchpad **and** confirm it on the
   explorer (same chain, correct ticker). Paste it into `VITE_TOKEN_ADDRESS`.
2. Set `VITE_TOKEN_URL` to the token's launchpad page.
3. Check `VITE_EXPLORER_URL` against Robinhood Chain's official docs (it was
   pre-filled with `https://robinhoodchain.blockscout.com` from a web search
   and could not be verified from the build sandbox). Open
   `<base>/token/<address>` in a browser and make sure it shows the token.
4. Fill `VITE_X_URL` / `VITE_TELEGRAM_URL`.
5. `npm test && npm run build`, then `npm run preview` and check the section,
   the Copy button and every link. Push to `main` to deploy.

To change or remove anything later, edit `.env` and push; clearing
`VITE_TOKEN_ADDRESS` hides the section again. The disclaimer text in
`TokenSection.tsx` must stay visible whenever the section is shown.

**Brand images** (`npm run share-images`) are written to `brand/`:
`token-logo.png` (1000×1000, for the launchpad/explorer; readable at 16px and
in a circle crop), `x-profile.png` (400×400), `x-banner.png` (1500×500, text
kept clear of X's profile-photo overlap), `telegram-group.png` (640×640). They
use the same mark as `favicon.svg` and our own templates and fonts.

## Hosting & deploys

- **Vercel** builds `npm run build` and serves `dist/` for every push to
  `main` (preview deploys for other branches). `vercel.json` only adds
  long-lived `Cache-Control: immutable` for the content-hashed files in
  `/assets/`. There's no separate `.wasm` file to configure: the WASM AAC
  encoder is inlined in its lazy JS chunk.
- **CI** (`.github/workflows/ci.yml`): typecheck, tests and a production
  build on every push and pull request. It does not deploy.
- **Old URL** (`https://savvycross.github.io/movly/`): `pages-redirect.yml`
  deploys a tiny page built by `scripts/build-redirect.mjs` that instantly
  redirects to `VITE_SITE_URL` (keeping `?query` and `#hash`; also served as
  `404.html` for any old deep link). It carries Open Graph tags for the new
  site so old links still preview correctly. It redeploys when `.env` or the
  script changes. Leave GitHub Pages enabled (Source: GitHub Actions) so the
  redirect keeps working.
- **Moving hosts again:** set `VITE_SITE_URL` (absolute URL, used by share
  tags and the redirect) and `VITE_BASE_PATH` (path prefix) in `.env`; no
  code changes. Share images contain no URLs, so they don't need
  regenerating.

## UX conventions

- Keyboard: **Space** = play/pause, **←/→** = step a frame (**Shift** = 1s).
  Ignored while typing in a text field or while the export dialog is open.
- The preview autoplays (a poster frame instead with `prefers-reduced-motion`).
- An empty headline renders `HEADLINE_PLACEHOLDER` in previews/thumbnails and
  blocks export with a message. Templates must still not crash on `''`.
- Preview shows "Loading <font>…" if a font takes >150ms; `loadFont` gives up
  after 4s and falls back to system fonts.

## Saved settings

`src/settings.ts` stores template, text, colors, font, ratio, speed and
duration under `movly:settings:v1`. Every field is validated on load and
dropped if invalid. **Never store the logo** (user content, and too big). All
storage access is wrapped in try/catch (private mode, quota).

## Adding a template

1. Create `src/templates/<name>.ts` exporting:
   `id`, `name`, `category` (`TemplateCategory`), `defaultDuration` (s),
   `defaultColors` (`{ bg, primary, accent }`) and
   `draw(ctx, time, params, stage)`.
2. Register it in `src/templates/index.ts` (`TEMPLATES`).
3. Start with `const { t, D } = fitTimeline(time, stage.duration, defaultDuration)`
   so intros/outros still complete when the user picks a short duration.
   Use `outro(t, D)` for the exit, `fitStagger()` so long text reveals finish on
   time, `readableOn()` for text on colored panels, and `drawLogoBadge()` to show
   the optional logo. Handle an empty `subline` and a missing `logo`.
4. `npm test` checks every template at every ratio with short/long/unbroken text
   for render errors and text leaving the stage. Also look at it in the preview
   at all 4 ratios, with a light palette (Paper/Candy) and with Space Mono.

## Conventions

- Time is measured in **frames** (30 fps, see `src/engine/timing.ts`). The
  timecode display is `seconds:frames` (`SS:FF`).
- Vite `base` comes from `VITE_BASE_PATH` (`.env`, default `/` for Vercel's
  domain root; e.g. `/movly/` for a sub-path host). Use
  `import.meta.env.BASE_URL` for runtime asset URLs; never hard-code
  `/`-rooted paths, so moving hosts stays a one-line `.env` change.
- Layout must work on mobile: below 860px the sidebar stacks under the preview.
  Check new UI at phone widths (~390px) with no horizontal scrolling.
