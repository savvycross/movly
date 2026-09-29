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
npm run preview   # serve the production build locally
```

## Project layout

```
src/
  main.tsx            # React entry
  App.tsx             # app shell: header, sidebar, preview, transport
  timing.ts           # FPS, default duration, SS:FF timecode formatting
  usePlayback.ts      # requestAnimationFrame playback clock (frame-based)
  components/
    Header.tsx        # Movly branding
    Sidebar.tsx       # template picker + customization controls (placeholder)
    Preview.tsx       # 16:9 preview canvas
    Transport.tsx     # play/pause, scrubber, timecode, Download
```

## Conventions

- Time is measured in **frames** (30 fps, see `src/timing.ts`). The timecode
  display is `seconds:frames` (`SS:FF`).
- Vite `base` is `/movly/` because the site is served from
  `https://<user>.github.io/movly/`. Use `import.meta.env.BASE_URL` for
  runtime asset URLs; never hard-code `/`-rooted paths.
- Layout must work on mobile: below 860px the sidebar stacks under the preview.
  Check new UI at phone widths (~390px) with no horizontal scrolling.
