'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { BlockCard, type BlockData } from './BlockCard';
import { AddBlockBar } from './AddBlockBar';

export interface LessonMeta {
  id: string;
  slug: string;
  title: string;
  pathTitle: string;
  skill: string;
  difficulty: string;
  estimatedMinutes: number;
  objectives: string[];
  prerequisites: string[];
  published: boolean;
}

const inputClass =
  'w-full rounded-lg border border-border bg-canvas px-3 py-2 text-footnote text-primary';
const labelClass = 'mb-1 block text-caption text-secondary';

export function LessonBuilder({
  lesson,
  initialBlocks,
}: {
  lesson: LessonMeta;
  initialBlocks: BlockData[];
}) {
  const router = useRouter();
  const [meta, setMeta] = useState(lesson);
  const [blocks, setBlocks] = useState<BlockData[]>(initialBlocks);
  const [metaSaving, setMetaSaving] = useState(false);
  const [metaSaved, setMetaSaved] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  async function saveMeta() {
    setMetaSaving(true);
    setMetaSaved(false);
    try {
      const res = await fetch(`/api/admin/lessons/${meta.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meta),
      });
      if (res.ok) setMetaSaved(true);
    } finally {
      setMetaSaving(false);
    }
  }

  async function togglePublish() {
    setPublishing(true);
    setPublishError(null);
    try {
      const res = await fetch(`/api/admin/lessons/${meta.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !meta.published }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPublishError(data.message ?? 'Не получилось');
        return;
      }
      setMeta((m) => ({ ...m, published: !m.published }));
    } finally {
      setPublishing(false);
    }
  }

  function moveBlock(id: string, dir: -1 | 1) {
    const sorted = [...blocks].sort((a, b) => a.order - b.order);
    const i = sorted.findIndex((b) => b.id === id);
    const j = i + dir;
    if (j < 0 || j >= sorted.length) return;
    [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
    const reordered = sorted.map((b, idx) => ({ ...b, order: idx }));
    setBlocks(reordered);
    void fetch(`/api/admin/lessons/${meta.id}/blocks`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: reordered.map((b) => b.id) }),
    });
  }

  function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  function addBlock(block: BlockData) {
    setBlocks((prev) => [...prev, block]);
  }

  function updateBlockPayload(id: string, payload: Record<string, unknown>) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, payload } : b)));
  }

  const sortedBlocks = [...blocks].sort((a, b) => a.order - b.order);
  const exerciseCount = blocks.filter((b) => b.kind === 'exercise').length;

  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col">
      {/* ── Top bar — title + publish ── */}
      <div className="flex items-center gap-4 border-b border-border bg-elevated px-6 py-3">
        <Link
          href="/admin"
          className="inline-flex shrink-0 items-center gap-1.5 text-footnote text-secondary hover:text-primary"
        >
          <ArrowLeft size={14} /> Все уроки
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-callout font-bold text-primary">{meta.title || 'Без названия'}</h1>
          <p className="text-caption text-tertiary">
            /{meta.slug} · {exerciseCount} {exerciseCount === 1 ? 'задание' : 'заданий'}
          </p>
        </div>
        {publishError && (
          <p className="flex items-center gap-1 text-caption text-danger">
            <AlertCircle size={12} /> {publishError}
          </p>
        )}
        <Button
          variant={meta.published ? 'secondary' : 'primary'}
          size="sm"
          onClick={togglePublish}
          disabled={publishing}
        >
          {meta.published ? 'Снять с публикации' : 'Опубликовать'}
        </Button>
      </div>

      {/* ── Three-pane constructor — meta · blocks · type palette ── */}
      <div className="flex min-h-0 flex-1">
        {/* Left — lesson name & parameters. */}
        <aside className="w-[280px] shrink-0 overflow-y-auto border-r border-border bg-elevated px-4 py-5">
          <p className="mb-3 text-caption font-semibold uppercase tracking-wide text-tertiary">
            Параметры урока
          </p>
          <div className="grid gap-3">
            <Field label="Название">
              <input
                className={inputClass}
                value={meta.title}
                onChange={(e) => setMeta({ ...meta, title: e.target.value })}
              />
            </Field>
            <Field label="Slug">
              <input
                className={inputClass}
                value={meta.slug}
                onChange={(e) => setMeta({ ...meta, slug: e.target.value })}
              />
            </Field>
            <Field label="Раздел (pathTitle)">
              <input
                className={inputClass}
                value={meta.pathTitle}
                onChange={(e) => setMeta({ ...meta, pathTitle: e.target.value })}
              />
            </Field>
            <Field label="Skill">
              <input
                className={inputClass}
                value={meta.skill}
                onChange={(e) => setMeta({ ...meta, skill: e.target.value })}
              />
            </Field>
            <Field label="Сложность">
              <select
                className={inputClass}
                value={meta.difficulty}
                onChange={(e) => setMeta({ ...meta, difficulty: e.target.value })}
              >
                {['intro', 'easy', 'medium', 'hard'].map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Минут">
              <input
                type="number"
                className={inputClass}
                value={meta.estimatedMinutes}
                onChange={(e) => setMeta({ ...meta, estimatedMinutes: Number(e.target.value) })}
              />
            </Field>
            <Field label="Цели урока (по одной в строке)">
              <textarea
                className={inputClass}
                rows={3}
                value={meta.objectives.join('\n')}
                onChange={(e) => setMeta({ ...meta, objectives: e.target.value.split('\n') })}
              />
            </Field>
            <Field label="Пререквизиты — slug'и (по одному в строке)">
              <textarea
                className={inputClass}
                rows={3}
                value={meta.prerequisites.join('\n')}
                onChange={(e) => setMeta({ ...meta, prerequisites: e.target.value.split('\n') })}
              />
            </Field>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button onClick={saveMeta} disabled={metaSaving} size="sm">
              Сохранить
            </Button>
            {metaSaved && (
              <span className="flex items-center gap-1 text-footnote text-success">
                <CheckCircle2 size={14} /> Сохранено
              </span>
            )}
          </div>
        </aside>

        {/* Center — the ordered blocks. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto max-w-[720px]">
            {sortedBlocks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border-strong px-6 py-16 text-center">
                <p className="text-callout font-medium text-primary">Пустой урок</p>
                <p className="mt-1 text-footnote text-secondary">
                  Выбери тип задания в палитре справа — блок добавится сюда.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedBlocks.map((block, i) => (
                  <BlockCard
                    key={block.id}
                    lessonId={meta.id}
                    block={block}
                    isFirst={i === 0}
                    isLast={i === sortedBlocks.length - 1}
                    onMove={(dir) => moveBlock(block.id, dir)}
                    onDelete={() => removeBlock(block.id)}
                    onSaved={(payload) => updateBlockPayload(block.id, payload)}
                  />
                ))}
              </div>
            )}

            <p className="mt-8 text-caption text-tertiary">
              Последнее задание в списке становится Mastery Challenge — добавь минимум одно, чтобы
              можно было опубликовать.
            </p>
            <div className="mt-4">
              <Button variant="ghost" size="sm" onClick={() => router.refresh()}>
                Обновить со страницы
              </Button>
            </div>
          </div>
        </div>

        {/* Right — the block-type palette. */}
        <aside className="w-[260px] shrink-0 overflow-y-auto border-l border-border bg-elevated px-4 py-5">
          <p className="mb-3 text-caption font-semibold uppercase tracking-wide text-tertiary">
            Добавить блок
          </p>
          <AddBlockBar lessonId={meta.id} nextOrder={blocks.length} onAdd={addBlock} />
        </aside>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}
