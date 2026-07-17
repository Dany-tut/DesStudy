/**
 * Rasterize one frame of the screen SVG to a PNG, in the browser.
 * ===============================================================
 * The AI naming pass needs to SEE the frame: these exports routinely have their
 * text converted to outlines, so the layer tree carries no readable string and a
 * text-only digest is blind to what the screen actually is.
 *
 * Browser-side on purpose — the SVG is already here, fonts and embedded images
 * resolve the way the canvas renders them, and the server never has to grow an
 * SVG renderer.
 */

/** Long-edge cap for the render. Claude reads up to 2576px, but a phone screen
 *  is legible well below that, and image tokens scale with area — this keeps a
 *  page-wide pass affordable without costing accuracy. */
const MAX_EDGE = 1400;

export interface FrameBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Draw `svg` into a canvas cropped to `box` (root user units) and return the PNG
 * as bare base64 — no `data:` prefix, which is the shape the Messages API wants.
 * Returns null when the SVG can't be decoded or the box is degenerate; callers
 * fall back to naming without an image.
 */
export async function rasterizeFrame(svg: string, box: FrameBox): Promise<string | null> {
  if (!(box.w > 0 && box.h > 0)) return null;

  // Scale so the long edge lands on MAX_EDGE, but never blow a small frame up:
  // upscaling an icon adds tokens and no detail.
  const scale = Math.min(MAX_EDGE / Math.max(box.w, box.h), 2);

  // encodeURIComponent, not base64: it survives the non-ASCII that Cyrillic
  // labels and `data-name` attributes put in the markup.
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
  } catch {
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(box.w * scale);
  canvas.height = Math.round(box.h * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // The frames sit on a dark canvas; without a backdrop the PNG's transparent
  // areas read as black and a dark-on-dark screen loses its edges.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.scale(scale, scale);
  // Draw the whole SVG shifted so the frame's origin lands at (0,0) — i.e. crop
  // to the frame. The <img> renders at the SVG's own width/height, which for
  // these exports maps 1:1 to the user units `box` is measured in.
  ctx.drawImage(img, -box.x, -box.y);

  // A data: source never taints the canvas, so toDataURL is safe here.
  return canvas.toDataURL('image/png').split(',')[1] ?? null;
}
