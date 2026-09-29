/** Intrinsic pixel size of any canvas image source (0×0 if unknown / not loaded). */
export function imageSize(img: CanvasImageSource): { width: number; height: number } {
  if (typeof HTMLImageElement !== 'undefined' && img instanceof HTMLImageElement)
    return { width: img.naturalWidth, height: img.naturalHeight }
  if (typeof HTMLVideoElement !== 'undefined' && img instanceof HTMLVideoElement)
    return { width: img.videoWidth, height: img.videoHeight }
  if ('width' in img && typeof img.width === 'number') return { width: img.width, height: img.height as number }
  return { width: 0, height: 0 }
}

/** Draws `img` scaled to fit inside the box (like CSS `object-fit: contain`), centered. */
export function drawImageContain(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const { width, height } = imageSize(img)
  if (!width || !height || w <= 0 || h <= 0) return
  const scale = Math.min(w / width, h / height)
  const dw = width * scale
  const dh = height * scale
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
}
