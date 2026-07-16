/**
 * Shared breakpoint math for the `breakpoint` exercise. Both the interactive
 * component (BreakpointDemo) and the deterministic validator import these, so
 * "what the learner sees" and "what counts as correct" can never drift apart.
 *
 * Three trigger variants, one derivation each:
 *   - 'measure'   → a text column stays 1-col until its line passes a comfortable
 *                   reading length (MEASURE); the goal is to land on that break.
 *   - 'min-width' → cards keep a minimum comfortable width (MINCARD); the column
 *                   count follows the viewport (auto-fit): 1 → 2 → 3 → 4.
 *   - 'fit'       → a nav row collapses to a burger once it no longer fits.
 */

export const BP_MIN = 320;
export const BP_MAX = 960;

/** Comfortable single-column reading measure, and the ± band that counts as "on the break". */
export const MEASURE = 640;
export const MEASURE_TOL = 30;

/** Minimum comfortable card width — drives the auto-fit column count. */
export const MINCARD = 220;

/** Width the full nav row needs to fit; below it, collapse to a burger. */
export const NAV_NEED = 620;

/** 'measure' variant: is the text column still one column at this width? */
export function measureIsTwoCol(width: number): boolean {
  return width > MEASURE;
}

/** 'measure' variant: has the learner landed on the 1→2 column break (±tol)? */
export function measureSolved(width: number): boolean {
  return Math.abs(width - MEASURE) <= MEASURE_TOL;
}

/** 'min-width' variant: auto-fit column count for a viewport width (1..4). */
export function columnsForWidth(width: number): number {
  return Math.max(1, Math.min(4, Math.floor(width / MINCARD)));
}

/** 'fit' variant: whether the nav shows the full row or a burger. */
export function navState(width: number): 'row' | 'burger' {
  return width < NAV_NEED ? 'burger' : 'row';
}
