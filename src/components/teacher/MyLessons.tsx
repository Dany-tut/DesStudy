'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, ExternalLink, Globe, Lock, Loader2, Check } from 'lucide-react';
import type { GroupView, LearnerOption } from './GroupsManager';

export interface LessonView {
  id: string;
  slug: string;
  title: string;
  published: boolean;
  access: 'PUBLIC' | 'RESTRICTED';
  groupIds: string[];
  learnerIds: string[];
}

const learnerLabel = (l: LearnerOption) => l.name?.trim() || `Ученик ${l.id.slice(0, 6)}`;

export function MyLessons({
  lessons,
  groups,
  learners,
}: {
  lessons: LessonView[];
  groups: GroupView[];
  learners: LearnerOption[];
}) {
  const [rows, setRows] = useState(lessons);

  function patch(id: string, next: Partial<LessonView>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...next } : r)));
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-caption font-medium text-on-brand transition-fast hover:opacity-90"
        >
          <Plus size={14} /> Собрать урок
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-surface px-4 py-6 text-center text-footnote text-tertiary">
          У тебя пока нет уроков. Нажми «Собрать урок».
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((l) => (
            <LessonRow key={l.id} lesson={l} groups={groups} learners={learners} onChange={(n) => patch(l.id, n)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function accessSummary(l: LessonView, groups: GroupView[]): string {
  if (l.access === 'PUBLIC') return 'Виден всем';
  const g = l.groupIds.length;
  const s = l.learnerIds.length;
  if (g === 0 && s === 0) return 'Никому (нет доступов)';
  const parts: string[] = [];
  if (g > 0) parts.push(`${g} ${g === 1 ? 'группа' : 'групп'}`);
  if (s > 0) parts.push(`${s} ${s === 1 ? 'ученик' : 'учеников'}`);
  return parts.join(' · ');
}

function LessonRow({
  lesson,
  groups,
  learners,
  onChange,
}: {
  lesson: LessonView;
  groups: GroupView[];
  learners: LearnerOption[];
  onChange: (next: Partial<LessonView>) => void;
}) {
  const [open, setOpen] = useState(false);
  const restricted = lesson.access === 'RESTRICTED';

  return (
    <li className="rounded-xl border border-border bg-elevated">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-footnote font-medium text-primary">{lesson.title}</p>
          <p className="text-caption text-tertiary">/{lesson.slug}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span
            className={[
              'rounded-full px-2.5 py-1 text-caption font-medium',
              lesson.published ? 'bg-[#3FB950]/10 text-[#3FB950]' : 'bg-border/60 text-tertiary',
            ].join(' ')}
          >
            {lesson.published ? 'Опубликован' : 'Черновик'}
          </span>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className={[
              'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-caption font-medium transition-fast',
              restricted ? 'border-brand/40 text-brand' : 'border-border text-secondary hover:border-brand/40',
            ].join(' ')}
          >
            {restricted ? <Lock size={12} /> : <Globe size={12} />}
            {accessSummary(lesson, groups)}
          </button>
          <Link
            href={`/admin/lessons/${lesson.id}`}
            className="inline-flex items-center gap-1 text-caption font-medium text-secondary transition-fast hover:text-brand"
          >
            Редактировать <ExternalLink size={12} />
          </Link>
        </div>
      </div>

      {open && (
        <AccessEditor
          lesson={lesson}
          groups={groups}
          learners={learners}
          onSaved={(next) => {
            onChange(next);
            setOpen(false);
          }}
        />
      )}
    </li>
  );
}

function AccessEditor({
  lesson,
  groups,
  learners,
  onSaved,
}: {
  lesson: LessonView;
  groups: GroupView[];
  learners: LearnerOption[];
  onSaved: (next: Partial<LessonView>) => void;
}) {
  const [access, setAccess] = useState<LessonView['access']>(lesson.access);
  const [groupIds, setGroupIds] = useState<Set<string>>(new Set(lesson.groupIds));
  const [learnerIds, setLearnerIds] = useState<Set<string>>(new Set(lesson.learnerIds));
  const [saving, setSaving] = useState(false);

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, id: string) => {
    const next = new Set(set);
    next.has(id) ? next.delete(id) : next.add(id);
    setter(next);
  };

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/teacher/lessons/${lesson.id}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access,
          groupIds: [...groupIds],
          learnerIds: [...learnerIds],
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onSaved({ access: data.access, groupIds: data.groupIds, learnerIds: data.learnerIds });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border-t border-border px-4 py-3">
      {/* Visibility toggle */}
      <div className="mb-3 inline-flex rounded-lg border border-border bg-surface p-0.5">
        {(
          [
            { v: 'PUBLIC' as const, icon: Globe, label: 'Виден всем' },
            { v: 'RESTRICTED' as const, icon: Lock, label: 'По доступу' },
          ]
        ).map(({ v, icon: Icon, label }) => (
          <button
            key={v}
            type="button"
            onClick={() => setAccess(v)}
            className={[
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-caption font-medium transition-fast',
              access === v ? 'bg-brand text-on-brand' : 'text-secondary hover:text-primary',
            ].join(' ')}
          >
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>

      {access === 'RESTRICTED' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-caption font-medium text-secondary">Группы</p>
            {groups.length === 0 ? (
              <p className="text-caption text-tertiary">Нет групп — создай ниже.</p>
            ) : (
              <ul className="space-y-1">
                {groups.map((g) => (
                  <CheckRow
                    key={g.id}
                    label={`${g.name} · ${g.members.length} чел.`}
                    checked={groupIds.has(g.id)}
                    onToggle={() => toggle(groupIds, setGroupIds, g.id)}
                  />
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="mb-1.5 text-caption font-medium text-secondary">Отдельные ученики</p>
            {learners.length === 0 ? (
              <p className="text-caption text-tertiary">Учеников пока нет.</p>
            ) : (
              <ul className="max-h-40 space-y-1 overflow-y-auto pr-1">
                {learners.map((l) => (
                  <CheckRow
                    key={l.id}
                    label={learnerLabel(l)}
                    checked={learnerIds.has(l.id)}
                    onToggle={() => toggle(learnerIds, setLearnerIds, l.id)}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-caption font-medium text-on-brand transition-fast hover:opacity-90 disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Сохранить доступ
        </button>
      </div>
    </div>
  );
}

function CheckRow({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-caption text-secondary transition-fast hover:bg-hover"
      >
        <span
          className={[
            'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-fast',
            checked ? 'border-brand bg-brand text-on-brand' : 'border-border',
          ].join(' ')}
        >
          {checked && <Check size={11} strokeWidth={3} />}
        </span>
        <span className="truncate">{label}</span>
      </button>
    </li>
  );
}
