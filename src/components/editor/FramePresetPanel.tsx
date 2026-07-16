'use client';

import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useT } from '@/lib/i18n/client';

import { ColorPicker } from './ColorPicker';

/**
 * The Figma-style frame-preset picker — shown on the right while the Frame tool
 * (F) is active and nothing is being drawn yet. Picking a size drops a fresh
 * artboard of those exact dimensions onto the canvas, mirroring Figma's "Frame"
 * panel with its device presets grouped by category.
 */

type Preset = { label: string; w: number; h: number };
type Group = { titleKey: string; open?: boolean; items: Preset[] };

// Base device sizes, straight from Figma's frame presets. Phone is expanded by
// default (the common case for these mobile-screen exercises); the rest fold.
const GROUPS: Group[] = [
  {
    titleKey: 'editor.frame.groupPhone',
    open: true,
    items: [
      { label: 'iPhone 17', w: 402, h: 874 },
      { label: 'iPhone 16 & 17 Pro', w: 402, h: 874 },
      { label: 'iPhone 16', w: 393, h: 852 },
      { label: 'iPhone 16 & 17 Pro Max', w: 440, h: 956 },
      { label: 'iPhone 16 Plus', w: 430, h: 932 },
      { label: 'iPhone Air', w: 420, h: 912 },
      { label: 'iPhone 14 & 15 Pro Max', w: 430, h: 932 },
      { label: 'iPhone 14 & 15 Pro', w: 393, h: 852 },
      { label: 'iPhone 13 & 14', w: 390, h: 844 },
      { label: 'iPhone 14 Plus', w: 428, h: 926 },
      { label: 'Android Compact', w: 412, h: 917 },
      { label: 'Android Medium', w: 700, h: 840 },
    ],
  },
  {
    titleKey: 'editor.frame.groupTablet',
    items: [
      { label: 'Surface Pro 8', w: 1440, h: 960 },
      { label: 'iPad mini 8.3', w: 744, h: 1133 },
      { label: 'iPad Pro 11"', w: 834, h: 1194 },
      { label: 'iPad Pro 12.9"', w: 1024, h: 1366 },
      { label: 'Android Expanded', w: 1280, h: 800 },
    ],
  },
  {
    titleKey: 'editor.frame.groupDesktop',
    items: [
      { label: 'Desktop', w: 1440, h: 1024 },
      { label: 'MacBook Air', w: 1280, h: 832 },
      { label: 'MacBook Pro 14"', w: 1512, h: 982 },
      { label: 'MacBook Pro 16"', w: 1728, h: 1117 },
      { label: 'iMac', w: 1280, h: 720 },
    ],
  },
];

export function FrameSizePanel({ onPick }: { onPick: (w: number, h: number) => void }) {
  const { t } = useT();
  return (
    <div className="flex flex-col">
      <div className="px-1 pb-3">
        <p className="text-caption font-medium uppercase tracking-wide text-tertiary">{t('editor.frame.title')}</p>
        <p className="mt-0.5 text-footnote text-secondary">{t('editor.frame.hint')}</p>
      </div>
      {GROUPS.map((g) => (
        <PresetGroup key={g.titleKey} group={g} onPick={onPick} />
      ))}
    </div>
  );
}

function PresetGroup({ group, onPick }: { group: Group; onPick: (w: number, h: number) => void }) {
  const { t } = useT();
  const [open, setOpen] = useState(!!group.open);
  return (
    <div className="border-b border-border py-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 px-1 py-1 text-left text-footnote font-semibold text-primary transition-fast hover:text-brand"
      >
        <ChevronRight size={13} className={['text-tertiary transition-fast', open ? 'rotate-90' : ''].join(' ')} />
        {t(group.titleKey)}
      </button>
      {open && (
        <div className="mt-1 flex flex-col">
          {group.items.map((p, i) => (
            <button
              key={`${p.label}-${i}`}
              type="button"
              onClick={() => onPick(p.w, p.h)}
              className="flex items-center justify-between rounded-md px-2 py-1.5 text-left transition-fast hover:bg-hover"
            >
              <span className="truncate text-caption text-primary">{p.label}</span>
              <span className="shrink-0 pl-2 text-caption tabular-nums text-tertiary">
                {p.w}×{p.h}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Canvas background swatch — Figma surfaces the page background colour when
 * nothing is selected. Sits under the exercise-setup panel in the deselected
 * state and repaints the dotted canvas behind the frames.
 */
export function CanvasBackgroundPanel({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useT();
  const hex = /^#[0-9a-f]{6}$/i.test(value) ? value : '#f7f8fa';
  return (
    <div className="border-t border-border pt-3">
      <p className="mb-2 px-1 text-caption font-medium text-secondary">{t('editor.frame.canvasBackground')}</p>
      <ColorPicker value={hex} onChange={onChange} />
    </div>
  );
}
