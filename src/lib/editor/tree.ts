/**
 * Pure operations on the layer tree — no React, no DOM, no SVG.
 *
 * They live here rather than inside EditorCore because they are the vocabulary
 * two other places need: LayerTree types its drag against `LayerDropPos`, and
 * the design system drives a real tree with `moveLayerInTree` so the drag in the
 * gallery is the same move the editor performs, not a lookalike.
 *
 * Everything is immutable: each function returns a new forest and never mutates
 * its input. EditorCore's undo stack snapshots whole trees, so a helper that
 * mutated in place would silently corrupt the history.
 */

import type { Layer } from './types';

/** Drop position of a layer-panel drag: reorder as a sibling before / after the
 *  target, or nest as the target's last child. */
export type LayerDropPos = 'before' | 'after' | 'inside';

/** Find a layer by id anywhere in the forest. */
export function findLayer(layers: Layer[], id: string): Layer | null {
  for (const l of layers) {
    if (l.id === id) return l;
    const found = findLayer(l.children, id);
    if (found) return found;
  }
  return null;
}

/** Drop one layer (and its subtree) from the tree. */
export function removeFromTree(layers: Layer[], id: string): Layer[] {
  const out: Layer[] = [];
  for (const l of layers) {
    if (l.id === id) continue;
    out.push(l.children.length ? { ...l, children: removeFromTree(l.children, id) } : l);
  }
  return out;
}

/** True when `id` is `layer` itself or anywhere in its subtree. */
export function inSubtree(layer: Layer, id: string): boolean {
  return layer.id === id || layer.children.some((c) => inSubtree(c, id));
}

/** Insert `node` relative to `targetId`: as its previous / next sibling, or (for
 *  `inside`) appended as its last child. Returns null when the target is absent. */
export function insertRelative(
  layers: Layer[],
  targetId: string,
  node: Layer,
  pos: LayerDropPos,
): Layer[] | null {
  let found = false;
  const walk = (list: Layer[]): Layer[] => {
    const out: Layer[] = [];
    for (const l of list) {
      if (l.id === targetId) {
        found = true;
        if (pos === 'inside') {
          out.push({ ...l, children: [...l.children, node] });
        } else if (pos === 'before') {
          out.push(node, l);
        } else {
          out.push(l, node);
        }
        continue;
      }
      out.push(l.children.length ? { ...l, children: walk(l.children) } : l);
    }
    return out;
  };
  const out = walk(layers);
  return found ? out : null;
}

/** Move `dragId` next to / inside `targetId`. Guards against dropping a node onto
 *  itself or into its own subtree; returns null when the move is invalid. */
export function moveLayerInTree(
  layers: Layer[],
  dragId: string,
  targetId: string,
  pos: LayerDropPos,
): Layer[] | null {
  if (dragId === targetId) return null;
  const dragged = findLayer(layers, dragId);
  if (!dragged) return null;
  if (inSubtree(dragged, targetId)) return null; // can't nest a node inside itself
  return insertRelative(removeFromTree(layers, dragId), targetId, dragged, pos);
}
