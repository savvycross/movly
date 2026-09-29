# Movly

Movly is a free web app for making short motion graphics. Users pick an
animation template, customize text, colors and logo, preview it, and download
it as a video — all inside the browser.

## The $0 rule (hard requirement)

Movly must cost **$0 to run**. Every change must respect this:

- **No backend.** No servers, serverless functions, databases or edge workers.
  The app is a static site hosted on GitHub Pages.
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
- Hosting: **GitHub Pages**, deployed by `.github/workflows/deploy.yml` on every
  push to `main`

## Commands

```bash
npm install       # install deps
npm run dev       # local dev server
npm run build     # typecheck (tsc -b) + production build into dist/
npm test          # vitest unit tests (engine helpers, template registry)
npm run preview   # serve the production build locally
npm run share-images  # regenerate public/og-image.png + icons (needs Playwright Chromium)
```

## Project layout

```
src/
  main.tsx              # React entry
  App.tsx               # app state: template, aspect, params, duration, colors, logo
  palettes.ts           # 8 ready-made color palettes
  settings.ts           # remember last settings in localStorage (validated; never the logo)
  limits.ts             # input limits, headline placeholder (withHeadlinePlaceholder)
  describe/
    match.ts            # "Describe it": offline keyword/synonym matcher → ranked suggestions
    match.test.ts       # 26 example phrases + name/aspect/fallback tests
  thumbClock.ts         # one shared rAF loop for all template thumbnails
  usePlayback.ts        # requestAnimationFrame playback clock (frame-based, loop/stop)
  components/
    Header.tsx          # Movly branding
    Hero.tsx            # short landing intro + "Start creating" (scrolls to #editor)
    DescribeBox.tsx     # "Describe it" input, example chips, 3 animated suggestions
    Sidebar.tsx         # template grid, format, text, colors, font, logo, timing controls
    TemplateThumb.tsx   # animated mini-preview (only animates while visible)
    Preview.tsx         # <canvas> preview: DPR-aware sizing, font loading, renderFrame
    Transport.tsx       # play/pause, loop, scrubber, SS:FF timecode, Download
    ExportDialog.tsx    # format/quality, progress, cancel, download/share
  export/
    plan.ts             # pure: export sizes, frame counts, file names, codec choice
    capabilities.ts     # probes WebCodecs encoders + MediaRecorder MIME types
    frames.ts           # renders composition frames onto an offscreen export canvas
    video.ts            # WebCodecs + Mediabunny path, MediaRecorder fallback
    gif.ts, gif.worker.ts  # GIF via gifenc in a Web Worker (global palette)
    mediabunny*.ts      # the only Mediabunny import sites (tree-shaken, lazy-loaded)
    watermark.ts        # optional "Made with Movly" corner badge (off by default)
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
  produce WebM; real Chrome/Edge/Safari produce MP4.

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
- Vite `base` is `/movly/` because the site is served from
  `https://<user>.github.io/movly/`. Use `import.meta.env.BASE_URL` for
  runtime asset URLs; never hard-code `/`-rooted paths.
- Layout must work on mobile: below 860px the sidebar stacks under the preview.
  Check new UI at phone widths (~390px) with no horizontal scrolling.
