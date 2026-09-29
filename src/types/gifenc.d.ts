declare module 'gifenc' {
  export type Palette = number[][]
  export type PaletteFormat = 'rgb565' | 'rgb444' | 'rgba4444'
  export function quantize(
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    options?: { format?: PaletteFormat; oneBitAlpha?: boolean | number; clearAlpha?: boolean },
  ): Palette
  export function applyPalette(rgba: Uint8Array | Uint8ClampedArray, palette: Palette, format?: PaletteFormat): Uint8Array
  export interface GIFStream {
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      opts?: { palette?: Palette; delay?: number; repeat?: number; transparent?: boolean; first?: boolean },
    ): void
    finish(): void
    bytes(): Uint8Array
    bytesView(): Uint8Array
  }
  export function GIFEncoder(opts?: { auto?: boolean; initialCapacity?: number }): GIFStream
}
