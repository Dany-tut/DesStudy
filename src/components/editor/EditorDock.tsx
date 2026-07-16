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
  Spline,
  MousePointerClick,
  Boxes,
  Code2,
  ChevronDown,
  Check,
  SquarePen,
  Share2,
  type LucideIcon,
} from 'lucide-react';
import type { EditorTool } from '@/lib/editor/types';

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
  label: string;
  icon: LucideIcon;
  /** Keyboard hint shown right-aligned in the menu. */
  hint?: string;
  /** Not wired yet — shown dimmed with a «скоро» tag, still selectable as its
   *  parent tool so the canvas falls back gracefully. */
  soon?: boolean;
}

interface ToolDef {
  id: EditorTool;
  label: string;
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
    label: 'Выделение · V',
    icon: MousePointer2,
    variants: [
      { id: 'move', label: 'Выделение', icon: MousePointer2, hint: 'V' },
      { id: 'scale', label: 'Масштаб', icon: Scaling, hint: 'K' },
      { id: 'hand', label: 'Рука', icon: Hand, hint: 'H', soon: true },
    ],
  },
  {
    id: 'frame',
    label: 'Фрейм · F',
    icon: Frame,
    variants: [
      { id: 'frame', label: 'Фрейм', icon: Frame, hint: 'F' },
      { id: 'section', label: 'Секция', icon: Crop, hint: '⇧S', soon: true },
      { id: 'slice', label: 'Срез', icon: Scissors, hint: 'S', soon: true },
    ],
  },
  {
    id: 'shape',
    label: 'Прямоугольник · R',
    icon: Square,
    variants: [
      { id: 'rect', label: 'Прямоугольник', icon: Square, hint: 'R' },
      { id: 'ellipse', label: 'Эллипс', icon: Circle, hint: 'O', soon: true },
      { id: 'line', label: 'Линия', icon: Minus, hint: 'L', soon: true },
      { id: 'arrow', label: 'Стрелка', icon: MoveUpRight, hint: '⇧L', soon: true },
      { id: 'polygon', label: 'Многоугольник', icon: Triangle, soon: true },
      { id: 'star', label: 'Звезда', icon: Star, soon: true },
      { id: 'image', label: 'Изображение…', icon: ImageIcon, hint: '⇧⌘K', soon: true },
    ],
  },
  { id: 'text', label: 'Текст · T', icon: Type },
  // ── divider ── (placeholders below)
  {
    id: 'pen',
    label: 'Перо · P',
    icon: PenTool,
    soon: true,
    variants: [
      { id: 'pen', label: 'Перо', icon: PenTool, hint: 'P', soon: true },
      { id: 'pencil', label: 'Карандаш', icon: Pencil, hint: '⇧P', soon: true },
    ],
  },
  {
    id: 'comment',
    label: 'Комментарий · C',
    icon: MessageCircle,
    soon: true,
    variants: [
      { id: 'comment', label: 'Комментарий', icon: MessageCircle, hint: 'C', soon: true },
      { id: 'annotation', label: 'Аннотация', icon: MessageSquareText, hint: 'Y', soon: true },
      { id: 'measure', label: 'Измерение', icon: Ruler, hint: '⇧M', soon: true },
    ],
  },
  { id: 'components', label: 'Компоненты', icon: Component, soon: true },
];

/** First placeholder tool — a divider is drawn just before it. */
const FIRST_SOON = TOOLS.findIndex((t) => t.soon);

/** Right-hand mode segment — matches the screenshot's grouped pill. Cosmetic for
 *  now (dev-mode / code hand-off arrive with the platform work). */
const MODE_SEGMENT: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'draw', label: 'Рисование', icon: Spline },
  { id: 'design', label: 'Дизайн', icon: MousePointerClick },
  { id: 'dev', label: 'Dev-режим', icon: Boxes },
  { id: 'code', label: 'Код', icon: Code2 },
];

/** The detached right-hand pill — static view modes (cosmetic for now). The
 *  first is highlighted as the current context (the editor itself). */
const VIEW_MODES: { id: string; label: string; icon: LucideIcon; active?: boolean }[] = [
  { id: 'editor', label: 'Редактор', icon: SquarePen, active: true },
  { id: 'share', label: 'Доступы', icon: Share2 },
];

export function EditorDock({
  tool,
  onTool,
}: {
  tool: EditorTool;
  onTool: (choice: ToolChoice) => void;
}) {
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
                            title={t.soon ? `${t.label} · скоро` : t.label}
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
                                      <span className="flex-1">{v.label}</span>
                                      {v.soon ? (
                                        <span className="rounded bg-hover px-1.5 py-0.5 text-caption text-tertiary">
                                          скоро
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

                  {/* Mode segment — grouped pill, visually separated. Cosmetic
                      for now, so the whole group is dimmed and tagged «скоро». */}
                  <span className="mx-1 h-6 w-px shrink-0 bg-border" />
                  <div className="flex items-center gap-0.5 rounded-xl bg-hover/60 p-0.5 opacity-45">
                    {MODE_SEGMENT.map((m) => {
                      const active = m.id === 'design'; // design mode = this editor
                      const Icon = m.icon;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          title={`${m.label} · скоро`}
                          className={[
                            'flex h-8 w-8 items-center justify-center rounded-lg transition-fast',
                            active ? 'bg-brand text-on-brand' : 'text-tertiary hover:text-primary',
                          ].join(' ')}
                        >
                          <Icon size={16} />
                        </button>
                      );
                    })}
                  </div>
            </div>
        </div>

        {/* Detached view-mode pill — static, decorative (no click, no animation),
            hung off the toolbar's right edge and mirroring its glass shape. */}
        <div className="glass pointer-events-none absolute left-full top-1/2 ml-2 flex -translate-y-1/2 items-center gap-1 rounded-2xl p-1.5 shadow-lg">
          {VIEW_MODES.map((m) => {
            const Icon = m.icon;
            return (
              <span
                key={m.id}
                title={m.label}
                className={[
                  'flex h-9 w-9 items-center justify-center rounded-xl',
                  m.active ? 'bg-brand text-on-brand' : 'text-secondary',
                ].join(' ')}
              >
                <Icon size={18} />
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
