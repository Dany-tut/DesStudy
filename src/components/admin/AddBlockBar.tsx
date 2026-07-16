'use client';

import { useState } from 'react';
import {
  BookOpen,
  Video,
  MousePointerClick,
  SlidersHorizontal,
  LayoutGrid,
  ArrowUpDown,
  Link2,
  Upload,
  ScanSearch,
} from 'lucide-react';
import { emptyDraft, draftToPayload } from '@/lib/admin/exerciseDraft';
import type { ExerciseDraft } from './ExerciseFieldsEditor';
import type { BlockData } from './BlockCard';

/** One palette entry — the type card the teacher clicks to append a block. */
type PaletteItem = {
  /** DB block kind. */
  kind: 'theory' | 'video' | 'exercise';
  /** Exercise sub-type (only for kind === 'exercise'). */
  type?: ExerciseDraft['type'];
  label: string;
  hint: string;
  icon: typeof BookOpen;
};

/** Content blocks. */
const CONTENT: PaletteItem[] = [
  { kind: 'theory', label: 'Теория', hint: 'Текстовый пункт с **выделением**', icon: BookOpen },
  { kind: 'video', label: 'Видео', hint: 'YouTube / Vimeo / файл', icon: Video },
];

/** Exercise types — only those with a working field editor + grader. */
const EXERCISES: PaletteItem[] = [
  { kind: 'exercise', type: 'choose', label: 'Выбор ответа', hint: 'Карточки выбора, один верный', icon: MousePointerClick },
  { kind: 'exercise', type: 'tune', label: 'Ползунок', hint: 'Точное значение в диапазоне', icon: SlidersHorizontal },
  { kind: 'exercise', type: 'build', label: 'Auto-layout карточка', hint: 'Собери gap и padding', icon: LayoutGrid },
  { kind: 'exercise', type: 'order', label: 'Порядок', hint: 'Расставь элементы drag-ом', icon: ArrowUpDown },
  { kind: 'exercise', type: 'figma-link', label: 'Ссылка на Figma', hint: 'Сдача макета + чек-лист', icon: Link2 },
  { kind: 'exercise', type: 'file-upload', label: 'Загрузка файла', hint: 'Приём PNG / PDF работы', icon: Upload },
  { kind: 'exercise', type: 'screen-critique', label: 'Разбор экрана', hint: 'Найди проблемы на макете', icon: ScanSearch },
];

/**
 * The block-type palette — a right-hand rail in the lesson constructor. Every
 * type is a card the teacher clicks to append a block; content blocks up top,
 * then the exercise types (mirroring what we drew in the design system). Adding
 * POSTs the block immediately and hands it back to the builder.
 */
export function AddBlockBar({
  lessonId,
  nextOrder,
  onAdd,
}: {
  lessonId: string;
  nextOrder: number;
  onAdd: (block: BlockData) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  async function addBlock(item: PaletteItem) {
    const key = item.type ?? item.kind;
    setBusy(key);
    try {
      const payload =
        item.kind === 'theory'
          ? { text: '' }
          : item.kind === 'video'
            ? { url: '', caption: '', provider: 'youtube' }
            : draftToPayload(emptyDraft(item.type!));
      const res = await fetch(`/api/admin/lessons/${lessonId}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: item.kind, payload }),
      });
      const data = await res.json();
      if (!res.ok) return;
      onAdd({ id: data.id, kind: item.kind, order: nextOrder, payload });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PaletteGroup title="Контент" items={CONTENT} busy={busy} onPick={addBlock} />
      <PaletteGroup title="Задания" items={EXERCISES} busy={busy} onPick={addBlock} />
    </div>
  );
}

function PaletteGroup({
  title,
  items,
  busy,
  onPick,
}: {
  title: string;
  items: PaletteItem[];
  busy: string | null;
  onPick: (item: PaletteItem) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-caption font-semibold uppercase tracking-wide text-tertiary">{title}</p>
      <div className="flex flex-col gap-1.5">
        {items.map((item) => {
          const key = item.type ?? item.kind;
          const Icon = item.icon;
          return (
            <button
              key={key}
              type="button"
              disabled={busy != null}
              onClick={() => onPick(item)}
              className="group flex items-start gap-2.5 rounded-lg border border-border bg-canvas px-3 py-2 text-left transition-fast hover:border-brand hover:bg-brand/5 disabled:opacity-50"
            >
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-secondary transition-fast group-hover:bg-brand/10 group-hover:text-brand">
                <Icon size={15} />
              </span>
              <span className="min-w-0">
                <span className="block text-footnote font-medium text-primary">
                  {busy === key ? 'Добавляю…' : item.label}
                </span>
                <span className="block truncate text-caption text-tertiary">{item.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
