'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

const DIFFICULTIES = [
  { value: 'intro', label: 'intro' },
  { value: 'easy', label: 'easy' },
  { value: 'medium', label: 'medium' },
  { value: 'hard', label: 'hard' },
];

/** Inline "new lesson" form — creates the meta row, then hands off to the block builder. */
export function CreateLessonForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [pathTitle, setPathTitle] = useState('');
  const [skill, setSkill] = useState('');
  const [difficulty, setDifficulty] = useState('easy');
  const [minutes, setMinutes] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus size={16} /> Новый урок
      </Button>
    );
  }

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          slug,
          pathTitle,
          skill,
          difficulty,
          estimatedMinutes: minutes,
          objectives: [],
          prerequisites: [],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? 'Не получилось создать урок');
        return;
      }
      router.push(`/admin/lessons/${data.id}`);
    } catch {
      setError('Не получилось создать урок — проверь соединение');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="mb-4 text-callout font-medium text-primary">Новый урок</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Название">
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            className="input"
            placeholder="Микровзаимодействия"
          />
        </Field>
        <Field label="Slug">
          <input
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugTouched(true);
            }}
            className="input"
            placeholder="micro-interactions"
          />
        </Field>
        <Field label="Раздел (pathTitle)">
          <input
            value={pathTitle}
            onChange={(e) => setPathTitle(e.target.value)}
            className="input"
            placeholder="От преподавателя"
          />
        </Field>
        <Field label="Skill (для аналитики)">
          <input
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
            className="input"
            placeholder="motion"
          />
        </Field>
        <Field label="Сложность">
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="input"
          >
            {DIFFICULTIES.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Минут на урок">
          <input
            type="number"
            min={1}
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            className="input"
          />
        </Field>
      </div>

      {error && <p className="mt-3 text-footnote text-danger">{error}</p>}

      <div className="mt-4 flex items-center gap-3">
        <Button
          onClick={submit}
          disabled={saving || !title || !slug || !pathTitle || !skill}
        >
          Создать и перейти к блокам
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Отмена
        </Button>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid var(--border);
          background: var(--bg-canvas);
          padding: 0.5rem 0.75rem;
          font-size: 14px;
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-footnote text-secondary">{label}</span>
      {children}
    </label>
  );
}
