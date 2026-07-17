/**
 * Inline-rename field styling, shared by every place a name is edited in place:
 * the file header, the pages list and the layers tree. Keeping it in one
 * constant is the whole point — these sit within a couple hundred pixels of each
 * other in the left rail, so any drift between them is plainly visible.
 *
 * Framed with `outline` rather than `border` deliberately: an outline paints
 * outside the box model, so swapping a label for this field cannot change a
 * row's height. The explicit focus colours override globals.css's softer,
 * 2px-offset :focus-visible ring, which on a short row reads as a pill drawn
 * around the field — and, next to a border, as a second frame.
 *
 * Radius is `rounded-sm` (the 6px token). Note that a bare `rounded` is a no-op
 * in this project: tailwind.config replaces the radius scale with tokens and
 * defines no DEFAULT, so the class silently produces square corners.
 *
 * Sizing — height, font, flex — stays with each caller: the rail's rows are
 * text-footnote, while the file name is text-body.
 */
export const RENAME_FIELD =
  'rounded-sm bg-surface text-primary outline outline-[1.5px] -outline-offset-1 outline-brand focus:outline-brand focus-visible:outline-brand';

/** Screen-px radius the canvas frame label divides by `scale` to match the
 *  panels' `rounded-sm` at any zoom (it lives inside the zoomed content layer,
 *  where a CSS radius would grow with the matrix). */
export const RENAME_RADIUS_PX = 6;
