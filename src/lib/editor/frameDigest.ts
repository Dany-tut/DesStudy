/**
 * Frame digest — what the AI naming pass sends about one frame.
 * =============================================================
 * The model is given a PNG of the frame plus this flat list of everything inside
 * it, each entry carrying a box in FRAME-relative units. That pairing is what
 * lets it name a layer: it finds the box in the picture and names what's drawn
 * there. Text alone isn't enough — these exports routinely outline their text,
 * leaving a tree of anonymous `Вектор 12` rows and nothing to read.
 *
 * Lives here, apart from `@/lib/ai/nameFrames`, on purpose: the editor is a
 * client component, and importing the naming module would drag the server-only
 * proxy code into the browser bundle.
 */
import type { Layer } from './types';

export interface LayerBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** One layer offered to the model for naming. */
export interface LayerRef {
  id: string;
  /** Current name. Kept as-is when a human clearly authored it. */
  name: string;
  type: Layer['type'];
  /** Nesting depth inside the frame — 1 is a direct child. Lets the model tell
   *  "the actions row" from "an icon inside a button in the actions row". */
  depth: number;
  /** Box relative to the frame's top-left, in user units. Absent when the layer
   *  couldn't be measured (not rendered) — the model then has only its type. */
  box?: LayerBox;
  /** Real text content, on the rare layer that has any. */
  text?: string;
}

/** Everything about one frame that goes into a single naming request. */
export interface FrameDigest {
  id: string;
  name: string;
  width: number;
  height: number;
  /** PNG of the frame as bare base64, or null when rasterizing failed — the
   *  model then names from structure alone, which is markedly worse. */
  imageBase64: string | null;
  layers: LayerRef[];
}

/** Hard cap per frame. A 400-layer screen would blow past max_tokens on the
 *  reply long before it ran out of anything useful to say; the tail of a big
 *  export is decorative vectors anyway. Dropped layers simply keep their names. */
export const MAX_LAYERS = 180;

/** Cap on a single text — the first words identify a layer as well as a paragraph. */
const MAX_TEXT_LEN = 60;

/**
 * Flatten a frame's subtree into the list the model names. `measure` returns a
 * layer's box in ROOT user space (the editor measures it off the live DOM,
 * which is the only place transforms are already applied); boxes are rebased
 * onto the frame here so the model reads them against the cropped image.
 */
export function digestFrame(
  frame: Layer,
  frameBox: LayerBox,
  measure: (id: string) => LayerBox | null,
): FrameDigest {
  const layers: LayerRef[] = [];

  const walk = (list: Layer[], depth: number) => {
    for (const l of list) {
      if (layers.length >= MAX_LAYERS) return;
      const abs = measure(l.id);
      const text = (l.props.text ?? '').replace(/\s+/g, ' ').trim();
      layers.push({
        id: l.id,
        name: l.name,
        type: l.type,
        depth,
        box: abs
          ? {
              x: Math.round(abs.x - frameBox.x),
              y: Math.round(abs.y - frameBox.y),
              w: Math.round(abs.w),
              h: Math.round(abs.h),
            }
          : undefined,
        text: text ? text.slice(0, MAX_TEXT_LEN) : undefined,
      });
      if (l.children.length) walk(l.children, depth + 1);
    }
  };
  walk(frame.children, 1);

  return {
    id: frame.id,
    name: frame.name,
    width: Math.round(frameBox.w),
    height: Math.round(frameBox.h),
    imageBase64: null, // filled in by the caller, which owns the rasterizer
    layers,
  };
}
