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
  IndexedDB). Nothing is uploaded anywhere.

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
  App.tsx               # app state (template, params, loop) + shell
  usePlayback.ts        # requestAnimationFrame playback clock (frame-based, loop/stop)
  components/
    Header.tsx          # Movly branding
    Sidebar.tsx         # template picker + customization controls
    Preview.tsx         # <canvas> preview: DPR-aware sizing, font loading, renderFrame
    Transport.tsx       # play/pause, loop, scrubber, SS:FF timecode, Download
  engine/               # framework-free animation engine (no React imports)
    types.ts            # Template, TemplateParams, TemplateColors
    render.ts           # STAGE (1920×1080) + renderFrame()
    timing.ts           # FPS (30), totalFrames(), frameToTime(), formatTimecode()
    easing.ts           # quad/cubic/expo/back/elastic/bounce In/Out/InOut + linear
    keyframes.ts        # tween() and interpolate() keyframe tracks
    text.ts             # fontString, fitFontSize/fitText, wrapLines, drawRevealText, revealEnd
    color.ts            # hexToRgb, withAlpha, mixColor
    image.ts            # drawImageContain (logos)
    fonts.ts            # FONTS list + loadFont() (canvas needs explicit font loading)
    math.ts             # clamp, lerp, mapRange
  templates/
    index.ts            # TEMPLATES registry
    cleanTitle.ts       # sample template
```

## Animation engine

- Everything renders on a single `<canvas>` at **30 fps**. Time is tracked in
  frames; `frameToTime(frame, speed)` converts to template seconds.
- Templates always draw on a **1920×1080 logical stage** (`STAGE`).
  `renderFrame` scales that to the actual canvas size (preview at screen size ×
  DPR, export at full resolution), so templates never deal with screen pixels.
- **Speed** is applied by the engine: at speed 2 the composition has half as
  many frames and `time` advances twice as fast. Templates just animate over
  `[0, defaultDuration]`.
- `draw()` must be a **pure function of `(time, params)`**: no state kept
  between calls, no `Math.random()` without a fixed seed, no reliance on the
  previous frame. Scrubbing, looping and frame-by-frame export depend on it.

## Adding a template

1. Create `src/templates/<name>.ts` exporting:
   `id`, `name`, `category` (`TemplateCategory`), `defaultDuration` (s),
   `defaultColors` (`{ bg, primary, accent }`) and
   `draw(ctx, time, params)`.
2. Register it in `src/templates/index.ts` (`TEMPLATES`).
3. Use the engine helpers (`tween`, `interpolate`, easings, `drawRevealText`,
   `fitText`) instead of hand-rolled timing math. Handle an empty `subline` and
   a missing `logo`. Use `params.font` for all text.
4. Check it by scrubbing through the whole timeline in the preview.

## Conventions

- Time is measured in **frames** (30 fps, see `src/timing.ts`). The timecode
  display is `seconds:frames` (`SS:FF`).
- Vite `base` is `/movly/` because the site is served from
  `https://<user>.github.io/movly/`. Use `import.meta.env.BASE_URL` for
  runtime asset URLs; never hard-code `/`-rooted paths.
- Layout must work on mobile: below 860px the sidebar stacks under the preview.
  Check new UI at phone widths (~390px) with no horizontal scrolling.
