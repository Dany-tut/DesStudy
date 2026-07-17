/**
 * SVG → layer tree. The pure core, `svgToScreen(doc)`, walks a parsed SVG
 * Document using only the standard DOM interface, so it runs both in the browser
 * (native DOMParser) and under test (xmldom). It MUTATES the document — tagging
 * every layer node with `data-layer-id` — so the caller can serialize the same
 * tree for the canvas and later find nodes by id for selection highlights.
 *
 * Geometry is intentionally NOT fully resolved (no transform-matrix math): the
 * canvas renders the original SVG for faithful pixels and measures nodes via the
 * DOM. What we extract here is STRUCTURE (names, nesting, type) + the few props
 * the teacher edits (radius / fill / text). Best-effort by design.
 */
import type { Layer, LayerType, ParsedScreen, ParseResult, LayerProps } from './types';

/** Tags Figma/most tools leave out of the visible tree — skip when walking. */
const SKIP_TAGS = new Set(['defs', 'clippath', 'lineargradient', 'radialgradient', 'pattern', 'mask', 'filter', 'title', 'desc', 'metadata', 'style', 'symbol', 'use']);

const VECTOR_TAGS = new Set(['path', 'circle', 'ellipse', 'polygon', 'polyline', 'line']);

function localName(el: Element): string {
  // xmldom exposes tagName with namespace prefix sometimes; normalize.
  return (el.localName || el.tagName || '').toLowerCase().replace(/^.*:/, '');
}

function typeOf(tag: string): LayerType {
  if (tag === 'g' || tag === 'svg') return 'frame';
  if (tag === 'text' || tag === 'tspan') return 'text';
  if (tag === 'rect') return 'block';
  if (tag === 'image') return 'image';
  return 'vector';
}

/** Pull a style property out of an inline `style="a:b; c:d"` attribute. */
function styleProp(el: Element, prop: string): string | undefined {
  const style = el.getAttribute('style');
  if (!style) return undefined;
  const m = style.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`, 'i'));
  return m ? m[1].trim() : undefined;
}

/** attribute-or-style lookup, attribute wins. */
function attrOrStyle(el: Element, name: string): string | undefined {
  const a = el.getAttribute(name);
  if (a != null && a !== '') return a;
  return styleProp(el, name);
}

function num(v: string | null | undefined): number | undefined {
  if (v == null) return undefined;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
}

/** Name from the most explicit source available, else a type-derived fallback.
 *  `isFrame` splits the `<g>` fallback: a real frame reads as «Фрейм», a plain
 *  group as «Группа», so the name matches the frame/group icon and badge. */
function nameOf(el: Element, tag: string, index: number, isFrame: boolean): string {
  const explicit =
    el.getAttribute('data-name') ||
    el.getAttribute('aria-label') ||
    el.getAttribute('id');
  if (explicit && explicit.trim()) return explicit.trim();

  // A <title> child (Figma "Include 'id' attribute" off but titles on).
  for (let i = 0; i < el.childNodes.length; i++) {
    const c = el.childNodes[i] as Element;
    if (c.nodeType === 1 && localName(c) === 'title' && c.textContent?.trim()) {
      return c.textContent.trim();
    }
  }

  const fallback: Record<LayerType, string> = {
    frame: isFrame ? 'Фрейм' : 'Группа', text: 'Текст', block: 'Блок', image: 'Картинка', vector: 'Вектор',
  };
  return `${fallback[typeOf(tag)]} ${index + 1}`;
}

function textContent(el: Element): string {
  return (el.textContent || '').replace(/\s+/g, ' ').trim();
}

function extractProps(el: Element, tag: string): LayerProps {
  const props: LayerProps = {};
  const fill = attrOrStyle(el, 'fill');

  const op = num(attrOrStyle(el, 'opacity'));
  if (op != null && op < 1) props.opacity = op;

  const stroke = attrOrStyle(el, 'stroke');
  if (stroke && stroke !== 'none') {
    props.stroke = stroke;
    props.strokeWidth = num(attrOrStyle(el, 'stroke-width')) ?? 1;
  }

  // A group/frame carrying a clip-path reads as "clip content" enabled.
  const clipped = !!(el.getAttribute('clip-path') || attrOrStyle(el, 'clip-path'));
  if (clipped) props.clip = true;

  // A real frame (own bounds/clip) vs a plain group. A `<g>` is a frame when it
  // was created via "group → frame" (`data-frame`) OR already clips its content
  // (a clip-path) — Figma imports a clipped group as a frame. Only frames get the
  // clip toggle; plain groups don't, matching Figma.
  if ((tag === 'g' || tag === 'svg') && (el.getAttribute('data-frame') || clipped)) {
    props.frame = true;
  }

  if (tag === 'rect') {
    props.radius = num(el.getAttribute('rx')) ?? num(el.getAttribute('ry'));
    if (fill && fill !== 'none') props.fill = fill;
    const x = num(el.getAttribute('x')), y = num(el.getAttribute('y'));
    const w = num(el.getAttribute('width')), h = num(el.getAttribute('height'));
    if (x != null && y != null && w != null && h != null) props.box = { x, y, w, h };
  } else if (tag === 'text' || tag === 'tspan') {
    props.text = textContent(el);
    props.fontSize = num(attrOrStyle(el, 'font-size'));
    props.fontWeight = attrOrStyle(el, 'font-weight');
    if (fill && fill !== 'none') props.color = fill;
  } else if (tag === 'image') {
    const x = num(el.getAttribute('x')), y = num(el.getAttribute('y'));
    const w = num(el.getAttribute('width')), h = num(el.getAttribute('height'));
    if (x != null && y != null && w != null && h != null) props.box = { x, y, w, h };
  } else {
    if (fill && fill !== 'none') props.fill = fill;
  }
  return props;
}

type Box = NonNullable<LayerProps['box']>;

/**
 * A frame's TRUE bounds come from its own clip rect, not the union of its
 * children. Figma exports a clipped frame as `<g clip-path="url(#id)">` whose
 * `<clipPath id>` (in <defs>) holds a single rect at the artboard bounds. The
 * children min/max we compute otherwise is wrong — it only sees `rect`/`image`
 * children (text and vectors have no box) and ignores nested `transform`s, so a
 * real screen resolves to a cropped, offset box (the crooked selection bug).
 *
 * Returns the clip rect's box in the frame's local space (the same space the
 * inserted `data-frame-bg` rect lives in), or null when the frame isn't clipped
 * by a plain `userSpaceOnUse` rect — then the caller falls back to min/max.
 */
function clipBox(el: Element): Box | null {
  const cp = el.getAttribute('clip-path') || styleProp(el, 'clip-path');
  if (!cp) return null;
  const m = cp.match(/url\(\s*["']?#([^"')\s]+)["']?\s*\)/);
  if (!m) return null;
  const doc = el.ownerDocument;
  if (!doc) return null;
  // getElementById is unreliable under xmldom — scan clipPath defs by id.
  const defs = doc.getElementsByTagName('clipPath');
  let def: Element | null = null;
  for (let i = 0; i < defs.length; i++) {
    if (defs[i].getAttribute('id') === m[1]) { def = defs[i]; break; }
  }
  if (!def) return null;
  // objectBoundingBox units are 0..1 fractions, not user-space px — can't use.
  const units = def.getAttribute('clipPathUnits');
  if (units && units !== 'userSpaceOnUse') return null;
  let rect: Element | null = null;
  for (let i = 0; i < def.childNodes.length; i++) {
    const c = def.childNodes[i] as Element;
    if (c.nodeType === 1 && localName(c) === 'rect') { rect = c; break; }
  }
  if (!rect) return null;
  // x/y default to 0 when omitted (SVG rects drop them at the origin — as Figma
  // exports a full-artboard clip rect: `<rect width=375 height=812/>`).
  const x = num(rect.getAttribute('x')) ?? 0, y = num(rect.getAttribute('y')) ?? 0;
  const w = num(rect.getAttribute('width')), h = num(rect.getAttribute('height'));
  if (w == null || h == null || !(w > 0) || !(h > 0)) return null;
  return { x, y, w, h };
}

/** Guess a frame's auto-layout flow from its children's boxes: aligned tops →
 *  a horizontal row, aligned lefts → a vertical column, else a grid/free group.
 *  Best-effort — used only to pick the Figma-style icon and layout hint. */
function inferLayout(boxes: Box[]): 'row' | 'column' | 'grid' | 'none' {
  if (boxes.length < 2) return 'none';
  const tol = (vals: number[], span: number) => {
    const min = Math.min(...vals), max = Math.max(...vals);
    return max - min <= Math.max(2, span * 0.15);
  };
  const sameTop = tol(boxes.map((b) => b.y), Math.max(...boxes.map((b) => b.h)));
  const sameLeft = tol(boxes.map((b) => b.x), Math.max(...boxes.map((b) => b.w)));
  if (sameTop && !sameLeft) return 'row';
  if (sameLeft && !sameTop) return 'column';
  return sameTop && sameLeft ? 'none' : 'grid';
}

/** Walk one element's graphical children into Layers. `counter` gives every
 *  layer a document-unique id (and drives fallback names). */
function walkChildren(el: Element, counter: { n: number }): Layer[] {
  const out: Layer[] = [];
  let siblingIndex = 0;
  for (let i = 0; i < el.childNodes.length; i++) {
    const node = el.childNodes[i];
    if (node.nodeType !== 1) continue; // elements only
    const child = node as Element;
    const tag = localName(child);
    if (SKIP_TAGS.has(tag)) continue;
    // A frame's own bounds rect is chrome, not a real child — it must never show
    // up in the layer tree (drawn frames and framified groups both carry one).
    if (child.getAttribute('data-frame-bg')) continue;

    const id = `L${counter.n++}`;
    child.setAttribute('data-layer-id', id);

    const type = typeOf(tag);
    // Text is a leaf — don't descend into tspans as separate layers; the text
    // content is already flattened into props.
    const children = tag === 'text' || VECTOR_TAGS.has(tag) ? [] : walkChildren(child, counter);

    const props = extractProps(child, tag);
    // Frames have no intrinsic geometry in SVG — derive a bounding box from the
    // children we could measure, and infer the auto-layout flow from how those
    // children line up (all same top ≈ a row, all same left ≈ a column).
    if (type === 'frame' && children.length) {
      const boxes = children.map((c) => c.props.box).filter(Boolean) as NonNullable<LayerProps['box']>[];
      // Prefer the frame's own clip rect (its real artboard bounds) over the
      // children min/max — the latter misses text/vectors and ignores nested
      // transforms, giving a cropped, offset box. Fall back to min/max only when
      // the frame carries no usable clip rect.
      const cbox = clipBox(child);
      if (cbox || boxes.length) {
        const { x, y, w, h } = cbox ?? {
          x: Math.min(...boxes.map((b) => b.x)),
          y: Math.min(...boxes.map((b) => b.y)),
          w: Math.max(...boxes.map((b) => b.x + b.w)) - Math.min(...boxes.map((b) => b.x)),
          h: Math.max(...boxes.map((b) => b.y + b.h)) - Math.min(...boxes.map((b) => b.y)),
        };
        props.box = { x, y, w, h };
        props.layout = inferLayout(boxes);
        // A frame has no fill of its own in SVG — its background is the first
        // full-bounds child rect (a dark artboard rect, a card surface). Surface
        // that as the frame's fill so the inspector shows a colour instead of
        // "Нет заливки", matching how Figma treats a frame's background. Only
        // adopt a child that actually spans the frame (≈ its box) and paints.
        if (!props.fill) {
          const bgFill = children.find((c) => {
            const b = c.props.box;
            return (
              c.type === 'block' &&
              c.props.fill &&
              b &&
              Math.abs(b.x - x) <= 1 &&
              Math.abs(b.y - y) <= 1 &&
              Math.abs(b.w - w) <= 1 &&
              Math.abs(b.h - h) <= 1
            );
          })?.props.fill;
          if (bgFill) props.fill = bgFill;
        }
        // A real frame (props.frame) needs its canonical bounds rect so the
        // canvas treats a resize as "move the border", not "scale the children".
        // Imported frames arrive as a bare `<g clip-path>` (clipPath sits in
        // <defs>, no bg rect), so without this a resize falls through to the
        // matrix-scale path and stretches the content. The rect is `fill="none"`
        // (geometry only, never paints) and we leave the existing clip-path
        // untouched — rewriting it to a bbox rect would break non-rectangular
        // masks (e.g. circular avatars). Idempotent: skip if one already exists.
        if (props.frame && !child.querySelector(':scope > rect[data-frame-bg]')) {
          const ns = 'http://www.w3.org/2000/svg';
          const bg = child.ownerDocument!.createElementNS(ns, 'rect');
          bg.setAttribute('x', String(x));
          bg.setAttribute('y', String(y));
          bg.setAttribute('width', String(w));
          bg.setAttribute('height', String(h));
          bg.setAttribute('fill', 'none');
          // "auto" = geometry derived here, off-DOM, from only those children that
          // carry explicit x/y/width/height (<rect>/<image>) — paths and text
          // contribute nothing, so this box can sit well inside the real content.
          // The canvas re-measures every "auto" rect against the live DOM once the
          // SVG mounts; a manual frame resize drops the marker and pins it.
          bg.setAttribute('data-frame-bg', 'auto');
          child.insertBefore(bg, child.firstChild);
        }
      }
    }

    out.push({
      id,
      name: nameOf(child, tag, siblingIndex, !!props.frame),
      type,
      props,
      children,
    });
    siblingIndex++;
  }
  return out;
}

/** viewBox "minX minY w h" → {w,h}; falls back to width/height attributes. */
function screenSize(svg: Element): { width: number; height: number } {
  const vb = svg.getAttribute('viewBox');
  if (vb) {
    const p = vb.trim().split(/[\s,]+/).map(Number);
    if (p.length === 4 && p.every(Number.isFinite)) return { width: p[2], height: p[3] };
  }
  return {
    width: num(svg.getAttribute('width')) ?? 0,
    height: num(svg.getAttribute('height')) ?? 0,
  };
}

/** Pure core: parse a DOM Document into a ParsedScreen, mutating it in place
 *  (adds data-layer-id to every layer node). Throws only on a missing svg root. */
export function svgToScreen(doc: Document): ParsedScreen {
  const svg = doc.documentElement && localName(doc.documentElement) === 'svg'
    ? doc.documentElement
    : doc.getElementsByTagName('svg')[0];
  if (!svg) throw new Error('no_svg_root');

  const { width, height } = screenSize(svg);
  const layers = walkChildren(svg, { n: 0 });
  return { width, height, layers };
}

/** Browser entry: parse an SVG string → tree + the (tagged) markup to render.
 *  Never throws — parse problems come back in `errors`. */
export function parseSvgToLayers(svgText: string): ParseResult {
  const empty: ParseResult = { screen: { width: 0, height: 0, layers: [] }, svg: '', errors: [] };
  if (!svgText.trim()) return { ...empty, errors: ['Файл пустой.'] };

  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  } catch {
    return { ...empty, errors: ['Не удалось разобрать файл как SVG.'] };
  }
  // DOMParser reports XML errors as a <parsererror> node instead of throwing.
  if (doc.getElementsByTagName('parsererror').length > 0) {
    return { ...empty, errors: ['Файл содержит ошибки разметки SVG.'] };
  }

  let screen: ParsedScreen;
  try {
    screen = svgToScreen(doc);
  } catch {
    return { ...empty, errors: ['В файле нет корневого <svg>.'] };
  }

  const rootSvg = localName(doc.documentElement) === 'svg' ? doc.documentElement : doc.getElementsByTagName('svg')[0];
  const svg = new XMLSerializer().serializeToString(rootSvg);
  const errors = screen.layers.length === 0 ? ['В SVG не найдено слоёв для разбора.'] : [];
  return { screen, svg, errors };
}
