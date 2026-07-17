'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GitCompareArrows, ChevronDown, X } from 'lucide-react';
import type { DefectEntry } from './EditorCore';
import { defectPropById } from '@/lib/curriculum/screenCritique';
import type { DefectDelta } from '@/lib/curriculum/types';
import { useT } from '@/lib/i18n/client';

/** Props whose value is a colour — rendered with a swatch instead of raw text. */
const COLOR_PROPS = new Set(['fill', 'color']);

/** A single «было → стало» value, with a colour swatch for colour props. `tone`
 *  tints the text: reference green for the эталон value, flaw red for the broken. */
function DeltaValue({ prop, value, tone }: { prop: string; value?: string; tone: 'was' | 'now' }) {
  const color = tone === 'was' ? 'var(--ref-green)' : 'var(--flaw-red)';
  const isColor = COLOR_PROPS.has(prop) && value && /^(#|rgb)/i.test(value);
  return (
    <span className="inline-flex items-center gap-1 font-medium tabular-nums" style={{ color }}>
      {isColor && (
        <span
          className="inline-block h-3 w-3 shrink-0 rounded-[3px] border border-border"
          style={{ background: value }}
        />
      )}
      {value || '—'}
    </span>
  );
}

/**
 * The bottom «Отличия» panel — the review surface for a critique/fix exercise.
 * Lists every layer inside a «сломанный» frame that diverges from its эталон
 * twin, grouped by frame, showing each changed property as было → стало. Clicking
 * a row selects the layer on the canvas; the checkbox promotes the diff to a
 * grading criterion (a critique zone pre-filled with these deltas).
 */
export function DiffPanel({
  defects,
  criterionLayerIds,
  selectedId,
  onSelect,
  onToggleCriterion,
}: {
  defects: DefectEntry[];
  /** Layer ids that already have a critique zone (marked as criteria). */
  criterionLayerIds: Set<string>;
  selectedId: string | null;
  onSelect: (layerId: string) => void;
  onToggleCriterion: (entry: DefectEntry) => void;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);

  // Group entries by their host flawed frame, preserving scan order.
  const groups: { frameId: string; frameName: string; entries: DefectEntry[] }[] = [];
  for (const e of defects) {
    let g = groups.find((x) => x.frameId === e.frameId);
    if (!g) {
      g = { frameId: e.frameId, frameName: e.frameName, entries: [] };
      groups.push(g);
    }
    g.entries.push(e);
  }

  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-20 flex flex-col items-start gap-2">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 460, damping: 34 }}
            className="glass pointer-events-auto flex max-h-[min(60vh,520px)] w-[340px] flex-col overflow-hidden rounded-2xl shadow-lg"
          >
            <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
              <GitCompareArrows size={15} className="text-brand" />
              <span className="flex-1 text-footnote font-semibold text-primary">
                {t('editor.diff.title')}
              </span>
              <span className="rounded-md bg-hover px-1.5 py-0.5 text-caption tabular-nums text-secondary">
                {defects.length}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-0.5 text-tertiary transition-fast hover:bg-hover hover:text-primary"
              >
                <X size={14} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {defects.length === 0 ? (
                <p className="px-2 py-6 text-center text-caption leading-relaxed text-tertiary">
                  {t('editor.diff.empty')}
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {groups.map((g) => (
                    <div key={g.frameId} className="flex flex-col gap-1">
                      <p className="px-1 text-caption font-medium uppercase tracking-wide text-tertiary">
                        {g.frameName}
                      </p>
                      {g.entries.map((e) => {
                        const active = e.layerId === selectedId;
                        const isCriterion = criterionLayerIds.has(e.layerId);
                        return (
                          <div
                            key={e.layerId}
                            className={[
                              'rounded-xl border px-2.5 py-2 transition-fast',
                              active ? 'border-brand/50 bg-brand/5' : 'border-border bg-surface hover:bg-hover',
                            ].join(' ')}
                          >
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => onSelect(e.layerId)}
                                className="min-w-0 flex-1 truncate text-left text-footnote font-medium text-primary"
                                title={e.layerName}
                              >
                                {e.layerName}
                              </button>
                              <label
                                className="flex shrink-0 cursor-pointer items-center gap-1 text-caption text-tertiary"
                                title={isCriterion ? t('editor.diff.criterionOn') : t('editor.diff.criterionOff')}
                              >
                                <input
                                  type="checkbox"
                                  checked={isCriterion}
                                  onChange={() => onToggleCriterion(e)}
                                  className="h-3.5 w-3.5 accent-[var(--brand)]"
                                />
                                {t('editor.diff.criterion')}
                              </label>
                            </div>
                            <div className="mt-1.5 flex flex-col gap-1">
                              {e.deltas.map((d: DefectDelta, i) => (
                                <div key={i} className="flex items-center gap-1.5 text-caption">
                                  <span className="w-[74px] shrink-0 truncate text-tertiary">
                                    {defectPropById(d.prop)?.label ?? d.prop}
                                  </span>
                                  <DeltaValue prop={d.prop} value={d.was} tone="was" />
                                  <span className="text-tertiary">→</span>
                                  <DeltaValue prop={d.prop} value={d.now} tone="now" />
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle pill — mirrors the dock's glass shape. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="glass pointer-events-auto flex items-center gap-2 rounded-2xl px-3.5 py-2.5 shadow-lg transition-fast hover:text-primary"
      >
        <GitCompareArrows size={16} className="text-brand" />
        <span className="text-footnote font-medium text-primary">{t('editor.diff.button')}</span>
        {defects.length > 0 && (
          <span className="rounded-md bg-[color-mix(in_srgb,var(--flaw-red)_15%,transparent)] px-1.5 py-0.5 text-caption font-semibold tabular-nums text-[var(--flaw-red)]">
            {defects.length}
          </span>
        )}
        <ChevronDown size={13} className={`text-tertiary transition-transform ${open ? '' : 'rotate-180'}`} />
      </button>
    </div>
  );
}
