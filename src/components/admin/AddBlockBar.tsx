'use client';

import { useState } from 'react';
import { Plus, BookOpen, Video, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { emptyDraft, draftToPayload } from '@/lib/admin/exerciseDraft';
import type { ExerciseDraft } from './ExerciseFieldsEditor';
import type { BlockData } from './BlockCard';

const EXERCISE_TYPES: { value: ExerciseDraft['type']; label: string }[] = [
  { value: 'choose', label: 'Выбор ответа' },
  { value: 'tune', label: 'Ползунок (tune)' },
  { value: 'build', label: 'Auto-layout карточка' },
  { value: 'order', label: 'Порядок (drag)' },
  { value: 'figma-link', label: 'Ссылка на Figma' },
  { value: 'file-upload', label: 'Загрузка файла' },
  { value: 'screen-critique', label: 'Разбор экрана' },
];

export function AddBlockBar({
  lessonId,
  nextOrder,
  onAdd,
}: {
  lessonId: string;
  nextOrder: number;
  onAdd: (block: BlockData) => void;
}) {
  const [showExerciseTypes, setShowExerciseTypes] = useState(false);
  const [busy, setBusy] = useState(false);

  async function addBlock(kind: string, payload: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/lessons/${lessonId}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, payload }),
      });
      const data = await res.json();
      if (!res.ok) return;
      onAdd({ id: data.id, kind, order: nextOrder, payload });
      setShowExerciseTypes(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-border-strong p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={() => addBlock('theory', { text: '' })}
        >
          <BookOpen size={14} /> Теория
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={() => addBlock('video', { url: '', caption: '', provider: 'youtube' })}
        >
          <Video size={14} /> Видео
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={() => setShowExerciseTypes((v) => !v)}
        >
          <ListChecks size={14} /> Задание
        </Button>
      </div>

      {showExerciseTypes && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
          {EXERCISE_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              disabled={busy}
              onClick={() => addBlock('exercise', draftToPayload(emptyDraft(t.value)))}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-canvas px-3 py-1.5 text-footnote text-secondary transition-fast hover:border-brand hover:text-primary"
            >
              <Plus size={13} /> {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
