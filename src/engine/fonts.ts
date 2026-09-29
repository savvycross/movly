/**
 * Fonts offered to users. They're served free by Google Fonts (linked in
 * index.html); keep this list and that <link> in sync.
 */
export const FONTS = ['Inter', 'Montserrat', 'Bebas Neue', 'Playfair Display', 'Space Mono'] as const

const WEIGHTS = [400, 500, 700, 800]

/**
 * Canvas text doesn't trigger web-font downloads on its own, so load a family
 * explicitly before drawing with it. Resolves even if loading fails (falls
 * back to system fonts).
 */
export async function loadFont(family: string): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return
  try {
    await Promise.all(WEIGHTS.map((w) => document.fonts.load(`${w} 64px "${family}"`)))
  } catch {
    // Offline or blocked: system fallback fonts are fine.
  }
}
