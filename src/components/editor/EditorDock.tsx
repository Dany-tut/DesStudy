'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import {
  MousePointer2,
  Hand,
  Scaling,
  Frame,
  Crop,
  Scissors,
  Square,
  Circle,
  Minus,
  MoveUpRight,
  Triangle,
  Star,
  ImageIcon,
  PenTool,
  Pencil,
  Type,
  MessageCircle,
  MessageSquareText,
  Ruler,
  Component,
  ChevronDown,
  Check,
  SquarePen,
  Share2,
  type LucideIcon,
} from 'lucide-react';
import type { EditorTool } from '@/lib/editor/types';
import { useT } from '@/lib/i18n/client';

/** A selection made from a tool group. `tool` is the underlying canvas tool;
 *  `variant` disambiguates sub-modes the tool exposes (e.g. move → scale). */
export interface ToolChoice {
  tool: EditorTool;
  variant?: string;
}

/**
 * The floating bottom dock — the Figma-style toolbar (select / frame / shape /
 * pen / text / comment / components, plus a dimmed mode segment on the right).
 *
 * A second, detached glass pill hangs off the toolbar's right edge with two
 * static view-mode icons (Редактор / Доступы). It's purely decorative for now —
 * no click, no animation — mirroring the shape of the toolbar itself.
 */

/** One entry in a tool's variant dropdown. */
interface VariantDef {
  id: string;
  /** i18n key for the variant label. */
  labelKey: string;
  icon: LucideIcon;
  /** Keyboard hint shown right-aligned in the menu. */
  hint?: string;
  /** Not wired yet — shown dimmed with a «скоро» tag, still selectable as its
   *  parent tool so the canvas falls back gracefully. */
  soon?: boolean;
}

interface ToolDef {
  id: EditorTool;
  /** i18n key for the tool label. */
  labelKey: string;
  icon: LucideIcon;
  /** Whole tool is a placeholder — dimmed, tagged «скоро». */
  soon?: boolean;
  /** Dropdown options. The first non-soon entry is the tool's default. */
  variants?: VariantDef[];
}

/**
 * Working tools first (full opacity), then a divider, then placeholders that are
 * dimmed and tagged «скоро» so they never read as ready. Variant dropdowns list
 * the real sub-modes; unimplemented shapes/modes are marked `soon` inside them.
 */
const TOOLS: ToolDef[] = [
  {
    id: 'move',
    labelKey: 'editor.dock.tools.move',
    icon: MousePointer2,
    variants: [
      { id: 'move', labelKey: 'editor.dock.variants.move', icon: MousePointer2, hint: 'V' },
      { id: 'scale', labelKey: 'editor.dock.variants.scale', icon: Scaling, hint: 'K' },
      { id: 'hand', labelKey: 'editor.dock.variants.hand', icon: Hand, hint: 'H', soon: true },
    ],
  },
  {
    id: 'frame',
    labelKey: 'editor.dock.tools.frame',
    icon: Frame,
    variants: [
      { id: 'frame', labelKey: 'editor.dock.variants.frame', icon: Frame, hint: 'F' },
      { id: 'section', labelKey: 'editor.dock.variants.section', icon: Crop, hint: '⇧S', soon: true },
      { id: 'slice', labelKey: 'editor.dock.variants.slice', icon: Scissors, hint: 'S', soon: true },
    ],
  },
  {
    id: 'shape',
    labelKey: 'editor.dock.tools.shape',
    icon: Square,
    variants: [
      { id: 'rect', labelKey: 'editor.dock.variants.rect', icon: Square, hint: 'R' },
      { id: 'ellipse', labelKey: 'editor.dock.variants.ellipse', icon: Circle, hint: 'O', soon: true },
      { id: 'line', labelKey: 'editor.dock.variants.line', icon: Minus, hint: 'L', soon: true },
      { id: 'arrow', labelKey: 'editor.dock.variants.arrow', icon: MoveUpRight, hint: '⇧L', soon: true },
      { id: 'polygon', labelKey: 'editor.dock.variants.polygon', icon: Triangle, soon: true },
      { id: 'star', labelKey: 'editor.dock.variants.star', icon: Star, soon: true },
      { id: 'image', labelKey: 'editor.dock.variants.image', icon: ImageIcon, hint: '⇧⌘K', soon: true },
    ],
  },
  { id: 'text', labelKey: 'editor.dock.tools.text', icon: Type },
  // ── divider ── (placeholders below)
  {
    id: 'pen',
    labelKey: 'editor.dock.tools.pen',
    icon: PenTool,
    soon: true,
    variants: [
      { id: 'pen', labelKey: 'editor.dock.variants.pen', icon: PenTool, hint: 'P', soon: true },
      { id: 'pencil', labelKey: 'editor.dock.variants.pencil', icon: Pencil, hint: '⇧P', soon: true },
    ],
  },
  {
    id: 'comment',
    labelKey: 'editor.dock.tools.comment',
    icon: MessageCircle,
    soon: true,
    variants: [
      { id: 'comment', labelKey: 'editor.dock.variants.comment', icon: MessageCircle, hint: 'C', soon: true },
      { id: 'annotation', labelKey: 'editor.dock.variants.annotation', icon: MessageSquareText, hint: 'Y', soon: true },
      { id: 'measure', labelKey: 'editor.dock.variants.measure', icon: Ruler, hint: '⇧M', soon: true },
    ],
  },
  { id: 'components', labelKey: 'editor.dock.tools.components', icon: Component, soon: true },
];

/** First placeholder tool — a divider is drawn just before it. */
const FIRST_SOON = TOOLS.findIndex((t) => t.soon);

export type ViewMode = 'editor' | 'share';

/** The detached right-hand pill — Редактор (canvas + tools) vs Доступы (the
 *  lesson settings / publish step). Controlled by the parent, which owns the
 *  step it maps onto. */
const VIEW_MODES: { id: ViewMode; labelKey: string; icon: LucideIcon }[] = [
  { id: 'editor', labelKey: 'editor.dock.views.editor', icon: SquarePen },
  { id: 'share', labelKey: 'editor.dock.views.share', icon: Share2 },
];

export function EditorDock({
  tool,
  onTool,
  viewMode,
  onViewMode,
}: {
  tool: EditorTool;
  onTool: (choice: ToolChoice) => void;
  viewMode: ViewMode;
  onViewMode: (m: ViewMode) => void;
}) {
  const { t: tr } = useT();
  // Which tool's variant dropdown is open + where its anchor button sits (viewport
  // coords), so the menu can be portalled to <body> — out of the dock's glass, so
  // its own backdrop-blur samples the canvas (a nested backdrop-filter doesn't).
  const [menu, setMenu] = useState<{ id: EditorTool; left: number; top: number } | null>(null);

  // Close the dropdown on outside click / Escape. The portalled menu
  // lives outside dockRef, so its own subtree is whitelisted via `[data-tool-menu]`.
  const dockRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Element;
      if (!dockRef.current?.contains(t) && !t.closest?.('[data-tool-menu]')) setMenu(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(null);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
      {/* A relative wrapper that hugs the toolbar (its only in-flow child), so
          the toolbar stays centred. The view-mode pill hangs off the right edge,
          absolutely positioned and out of flow, so it never shifts the centre —
          and, as a SIBLING of the glass toolbar rather than a descendant, its own
          backdrop-filter samples the canvas (a nested backdrop-filter is a no-op). */}
      <div className="relative">
        <div
          ref={dockRef}
          className="glass pointer-events-auto relative flex items-center gap-1 rounded-2xl p-1.5 shadow-lg"
        >
            <div className="flex shrink-0 items-center gap-1 whitespace-nowrap">
                  {TOOLS.map((t, i) => {
                    const active = t.id === tool;
                    const Icon = t.icon;
                    const open = menu?.id === t.id;
                    return (
                      <div key={t.id} className="flex items-center gap-1">
                        {/* Divider before the first placeholder tool. */}
                        {i === FIRST_SOON && <span className="mx-0.5 h-6 w-px shrink-0 bg-border" />}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => onTool({ tool: t.id })}
                            title={t.soon ? `${tr(t.labelKey)} · ${tr('editor.dock.soon')}` : tr(t.labelKey)}
                            className={[
                              'flex h-9 items-center gap-0.5 rounded-xl pl-2 transition-fast',
                              t.variants ? 'pr-1' : 'pr-2',
                              active
                                ? 'bg-brand text-on-brand'
                                : 'text-secondary hover:bg-hover hover:text-primary',
                              t.soon && !active ? 'opacity-45' : '',
                            ].join(' ')}
                          >
                            <Icon size={18} />
                            {t.variants && (
                              <span
                                role="button"
                                tabIndex={0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (open) {
                                    setMenu(null);
                                    return;
                                  }
                                  const btn = (e.currentTarget as HTMLElement).closest('button');
                                  const r = (btn ?? (e.currentTarget as HTMLElement)).getBoundingClientRect();
                                  setMenu({ id: t.id, left: r.left, top: r.top });
                                }}
                                className={[
                                  'flex h-5 w-4 items-center justify-center rounded-md transition-fast',
                                  active ? 'hover:bg-white/20' : 'hover:bg-hover',
                                ].join(' ')}
                              >
                                <ChevronDown
                                  size={11}
                                  className={[
                                    'transition-transform',
                                    open ? '' : 'rotate-180',
                                    active ? 'text-on-brand/70' : 'text-tertiary',
                                  ].join(' ')}
                                />
                              </span>
                            )}
                          </button>

                          {/* Variant dropdown — portalled to <body> so its
                              backdrop-blur samples the canvas (a nested
                              backdrop-filter inside the dock's glass is a no-op),
                              matching the right-click menu. Anchored above the
                              button via a zero-size fixed wrapper at its rect. */}
                          {open && menu && t.variants && typeof document !== 'undefined' &&
                            createPortal(
                              <div
                                data-tool-menu
                                className="pointer-events-none fixed z-50"
                                style={{ left: menu.left, top: menu.top }}
                              >
                              <motion.div
                                initial={{ opacity: 0, y: 6, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ type: 'spring', stiffness: 520, damping: 34 }}
                                className="pointer-events-auto absolute bottom-full left-0 mb-2 min-w-[204px] rounded-xl border border-border bg-[color-mix(in_srgb,var(--bg-elevated)_92%,transparent)] p-1 shadow-lg backdrop-blur-md"
                              >
                                {t.variants.map((v) => {
                                  const VIcon = v.icon;
                                  const isDefault = v.id === t.variants![0].id && active;
                                  return (
                                    <button
                                      key={v.id}
                                      type="button"
                                      onClick={() => {
                                        onTool({ tool: t.id, variant: v.id });
                                        setMenu(null);
                                      }}
                                      className={[
                                        'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-footnote transition-fast',
                                        'text-primary hover:bg-hover',
                                        v.soon ? 'opacity-45' : '',
                                      ].join(' ')}
                                    >
                                      <Check
                                        size={13}
                                        className={isDefault ? 'text-brand' : 'text-transparent'}
                                      />
                                      <VIcon size={15} className="shrink-0 text-secondary" />
                                      <span className="flex-1">{tr(v.labelKey)}</span>
                                      {v.soon ? (
                                        <span className="rounded bg-hover px-1.5 py-0.5 text-caption text-tertiary">
                                          {tr('editor.dock.soon')}
                                        </span>
                                      ) : (
                                        v.hint && (
                                          <span className="text-caption tabular-nums text-tertiary">
                                            {v.hint}
                                          </span>
                                        )
                                      )}
                                    </button>
                                  );
                                })}
                              </motion.div>
                              </div>,
                              document.body,
                            )}
                        </div>
                      </div>
                    );
                  })}

            </div>
        </div>

        {/* Detached view-mode pill — hung off the toolbar's right edge and
            mirroring its glass shape. Clickable: picking one highlights it. */}
        <div className="glass pointer-events-auto absolute left-full top-1/2 ml-2 flex -translate-y-1/2 items-center gap-1 rounded-2xl p-1.5 shadow-lg">
          {VIEW_MODES.map((m) => {
            const Icon = m.icon;
            const active = viewMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                title={tr(m.labelKey)}
                aria-pressed={active}
                onClick={() => onViewMode(m.id)}
                className={[
                  'flex h-9 w-9 items-center justify-center rounded-xl transition-fast',
                  active ? 'bg-brand text-on-brand' : 'text-secondary hover:bg-hover hover:text-primary',
                ].join(' ')}
              >
                <Icon size={18} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
