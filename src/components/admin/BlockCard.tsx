'use client';

import { useState } from 'react';
import { ArrowUp, ArrowDown, Trash2, CheckCircle2, Eye, EyeOff, BookOpen, Video, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ExercisePlayer } from '@/components/exercises/ExercisePlayer';
import { ExerciseFieldsEditor } from './ExerciseFieldsEditor';
import { payloadToDraft, draftToPayload } from '@/lib/admin/exerciseDraft';
import type { Exercise } from '@/lib/curriculum/types';

export interface BlockData {
  id: string;
  kind: string;
  order: number;
  payload: Record<string, unknown>;
}

const inputClass =
  'w-full rounded-lg border border-border bg-canvas px-3 py-2 text-footnote text-primary';
const labelClass = 'mb-1 block text-caption text-secondary';

const KIND_META: Record<string, { label: string; icon: typeof BookOpen }> = {
  theory: { label: 'Теория', icon: BookOpen },
  video: { label: 'Видео', icon: Video },
  exercise: { label: 'Задание', icon: ListChecks },
};

export function BlockCard({
  lessonId,
  block,
  isFirst,
  isLast,
  onMove,
  onDelete,
  onSaved,
}: {
  lessonId: string;
  block: BlockData;
  isFirst: boolean;
  isLast: boolean;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
  onSaved: (payload: Record<string, unknown>) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [preview, setPreview] = useState(false);

  const [text, setText] = useState((block.payload.text as string) ?? '');
  const [url, setUrl] = useState((block.payload.url as string) ?? '');
  const [caption, setCaption] = useState((block.payload.caption as string) ?? '');
  const [provider, setProvider] = useState((block.payload.provider as string) ?? 'youtube');
  const [draft, setDraft] = useState(() => payloadToDraft(block.payload));

  const meta = KIND_META[block.kind] ?? KIND_META.theory;
  const Icon = meta.icon;

  async function save(payload: Record<string, unknown>) {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch(`/api/admin/lessons/${lessonId}/blocks/${block.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? 'Не получилось сохранить');
        return;
      }
      onSaved(payload);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setDeleting(true);
    await fetch(`/api/admin/lessons/${lessonId}/blocks/${block.id}`, { method: 'DELETE' });
    onDelete();
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-secondary">
          <Icon size={15} />
        </span>
        <span className="flex-1 text-footnote font-medium text-secondary">{meta.label}</span>
        <div className="flex items-center gap-1">
          <IconButton disabled={isFirst} onClick={() => onMove(-1)} label="Выше">
            <ArrowUp size={14} />
          </IconButton>
          <IconButton disabled={isLast} onClick={() => onMove(1)} label="Ниже">
            <ArrowDown size={14} />
          </IconButton>
          <IconButton onClick={remove} disabled={deleting} label="Удалить" danger>
            <Trash2 size={14} />
          </IconButton>
        </div>
      </div>

      {block.kind === 'theory' && (
        <textarea
          className={inputClass}
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Пункт теории — можно **выделять важное**"
        />
      )}

      {block.kind === 'video' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>URL</label>
            <input
              className={inputClass}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
            />
          </div>
          <div>
            <label className={labelClass}>Подпись</label>
            <input className={inputClass} value={caption} onChange={(e) => setCaption(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Источник</label>
            <select className={inputClass} value={provider} onChange={(e) => setProvider(e.target.value)}>
              <option value="youtube">YouTube</option>
              <option value="vimeo">Vimeo</option>
              <option value="file">Файл (mp4 и т.п.)</option>
            </select>
          </div>
        </div>
      )}

      {block.kind === 'exercise' && (
        <>
          <p className="mb-3 text-caption text-tertiary">Тип: {draft.type}</p>
          <ExerciseFieldsEditor draft={draft} onChange={setDraft} />
        </>
      )}

      {error && <p className="mt-2 text-footnote text-danger">{error}</p>}

      <div className="mt-4 flex items-center gap-3">
        <Button
          size="sm"
          onClick={() => {
            if (block.kind === 'theory') void save({ text });
            else if (block.kind === 'video') void save({ url, caption, provider });
            else void save(draftToPayload(draft));
          }}
          disabled={saving}
        >
          Сохранить блок
        </Button>
        {block.kind === 'exercise' && (
          <Button variant="ghost" size="sm" onClick={() => setPreview((p) => !p)}>
            {preview ? <EyeOff size={14} /> : <Eye size={14} />} Предпросмотр
          </Button>
        )}
        {saved && (
          <span className="flex items-center gap-1 text-footnote text-success">
            <CheckCircle2 size={14} /> Сохранено
          </span>
        )}
      </div>

      {block.kind === 'exercise' && preview && (
        <div className="mt-4 border-t border-border pt-4">
          <ExercisePlayer
            exercise={draftToPayload(draft) as unknown as Exercise}
            lessonTitle="Предпросмотр"
            lessonSlug="__preview__"
            skill="preview"
            lessonTotal={1}
          />
        </div>
      )}
    </div>
  );
}

function IconButton({
  children,
  onClick,
  disabled,
  label,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={[
        'flex h-7 w-7 items-center justify-center rounded-md text-tertiary transition-fast disabled:cursor-not-allowed disabled:opacity-30',
        danger ? 'hover:bg-danger/10 hover:text-danger' : 'hover:bg-hover hover:text-primary',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
