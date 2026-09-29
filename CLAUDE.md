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
```

## Project layout

```
src/
  main.tsx              # React entry
  App.tsx               # app state: template, aspect, params, duration, colors, logo
  palettes.ts           # 8 ready-made color palettes
  thumbClock.ts         # one shared rAF loop for all template thumbnails
  usePlayback.ts        # requestAnimationFrame playback clock (frame-based, loop/stop)
  components/
    Header.tsx          # Movly branding
    Sidebar.tsx         # template grid, format, text, colors, font, logo, timing controls
    TemplateThumb.tsx   # animated mini-preview (only animates while visible)
    Preview.tsx         # <canvas> preview: DPR-aware sizing, font loading, renderFrame
    Transport.tsx       # play/pause, loop, scrubber, SS:FF timecode, Download
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
