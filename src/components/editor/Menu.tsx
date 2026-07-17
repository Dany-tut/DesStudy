'use client';

/**
 * The reference context menu — one surface, one item, one separator, for every
 * right-click in the editor.
 *
 * It exists because there are currently two: LayerTree's (translucent, blurred,
 * `rounded-md` items, regular weight, danger shown by reddening the text on
 * hover) and PagesPanel's (opaque, `rounded-lg` items, medium weight, danger
 * shown with a red wash). They sit inches apart in the same rail, so the drift
 * is visible.
 *
 * Where they disagree, this picks:
 *
 *   Surface — translucent + blur. It reads as chrome floating over the canvas
 *     rather than as another opaque panel competing with the rail.
 *   Item radius — `rounded-lg`. NOT a taste call: the surface is `rounded-xl`
 *     (20px) with `p-1.5` (6px), so a concentric inner corner is 20 − 6 = 14px,
 *     which is exactly `rounded-lg`. LayerTree's 10px leaves the item's corner
 *     tighter than the surface hugging it, which is the same mistake the
 *     NestedRadius exercise teaches students to spot.
 *   Danger — red text plus a red wash on hover. Text alone only announces the
 *     consequence once the pointer is already on it.
 *
 * Positioning and dismissal are deliberately NOT here: this is the surface, not
 * the popover. Callers keep owning where a menu appears and when it closes,
 * because that differs (cursor-anchored right-click vs. button-anchored
 * dropdown) and it is the part that must not be copy-pasted wrong.
 *
 * Not yet adopted by LayerTree / PagesPanel — the agreed shape first, the
 * migration after.
 */

/** The floating panel a menu's items sit in. */
export function MenuSurface({
  children,
  className = '',
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      onContextMenu={(e) => e.preventDefault()}
      className={`min-w-[200px] rounded-xl border border-border bg-[color-mix(in_srgb,var(--bg-elevated)_92%,transparent)] p-1.5 shadow-lg backdrop-blur-md ${className}`}
    >
      {children}
    </div>
  );
}

/** One row of a menu. `shortcut` renders right-aligned; `danger` marks a
 *  destructive action; `disabled` keeps the row readable but inert. */
export function MenuItem({
  icon,
  label,
  shortcut,
  danger,
  disabled,
  onClick,
}: {
  icon?: React.ReactNode;
  label: string;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        'flex w-full items-center gap-2.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-left text-footnote font-medium transition-fast',
        'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent',
        danger
          ? 'text-danger hover:bg-danger/10 disabled:hover:text-danger'
          : 'text-secondary hover:bg-hover hover:text-primary disabled:hover:text-secondary',
      ].join(' ')}
    >
      {icon && <span className={`shrink-0 ${danger ? '' : 'text-tertiary'}`}>{icon}</span>}
      {label}
      {shortcut && <span className="ml-auto shrink-0 pl-4 text-caption text-tertiary">{shortcut}</span>}
    </button>
  );
}

/** Groups items by consequence — the rule is that anything destructive sits
 *  below one of these, never adjacent to a routine action. */
export function MenuSeparator() {
  return <div className="my-1 h-px bg-border" />;
}
