'use client';

import { useState } from 'react';
import {
  Plus,
  Link2,
  Loader2,
  Check,
  Copy,
  X,
  UserRound,
  KeyRound,
  ClipboardList,
  Sparkles,
} from 'lucide-react';
import { RadarChart } from '@/components/assessment/RadarChart';
import {
  LearnerResultCard,
  type CourseOption,
  type ApplicationInfo,
} from '@/components/admin/LearnerResultCard';
import { CATEGORIES, GRADE_LABEL, type Grade } from '@/lib/assessment/taxonomy';
import { computeGrade, type Scores } from '@/lib/assessment/grade';

export interface StudentCard {
  id: string;
  name: string | null;
  hasAccount: boolean;
  grade: string | null;
  scores: Scores | null;
  takenAt: string | null;
  enrolledCourseIds: string[];
  application: ApplicationInfo | null;
}

/** A generated invite link awaiting copy. */
interface LinkState {
  url: string;
  title: string;
}

export function TestingBoard({
  students: initial,
  courses,
}: {
  students: StudentCard[];
  courses: CourseOption[];
}) {
  const [students, setStudents] = useState(initial);
  const [detail, setDetail] = useState<StudentCard | null>(null);
  const [link, setLink] = useState<LinkState | null>(null);
  const [leadsOnly, setLeadsOnly] = useState(false);

  // "add student" inline form
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);

  async function createTestLink() {
    setBusy(true);
    try {
      const res = await fetch('/api/teacher/learner-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'TEST' }),
      });
      const data = await res.json();
      if (res.ok) setLink({ url: data.url, title: 'Ссылка на тест' });
    } finally {
      setBusy(false);
    }
  }

  async function createLoginLink(student: StudentCard) {
    setBusy(true);
    try {
      const res = await fetch('/api/teacher/learner-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'LOGIN', learnerId: student.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setLink({ url: data.url, title: `Ссылка на вход · ${student.name ?? 'ученик'}` });
      }
    } finally {
      setBusy(false);
    }
  }

  async function addStudent() {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    try {
      const res = await fetch('/api/teacher/learners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (res.ok) {
        setStudents((prev) => [
          {
            id: data.id,
            name: data.name,
            hasAccount: false,
            grade: null,
            scores: null,
            takenAt: null,
            enrolledCourseIds: [],
            application: null,
          },
          ...prev,
        ]);
        setNewName('');
        setAdding(false);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8">
      {/* toolbar */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={createTestLink}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-footnote font-medium text-on-brand transition-fast hover:opacity-90 disabled:opacity-50"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Link2 size={15} />}
          Ссылка на тест
        </button>

        {adding ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void addStudent();
                if (e.key === 'Escape') setAdding(false);
              }}
              placeholder="Имя Фамилия"
              className="rounded-lg border border-border bg-surface px-3 py-2 text-footnote text-primary outline-none focus:border-brand"
            />
            <button
              type="button"
              onClick={addStudent}
              disabled={busy || !newName.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-footnote text-primary transition-fast hover:bg-hover disabled:opacity-50"
            >
              <Check size={15} className="text-brand" /> Добавить
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="rounded-lg p-2 text-tertiary transition-fast hover:text-primary"
            >
              <X size={15} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-footnote font-medium text-secondary transition-fast hover:bg-hover"
          >
            <Plus size={15} /> Добавить ученика
          </button>
        )}

        {students.some((s) => s.application) && (
          <div className="ml-auto flex items-center gap-1 rounded-lg border border-border bg-surface p-0.5">
            {[
              { key: false, label: 'Все' },
              { key: true, label: 'С заявкой' },
            ].map((opt) => (
              <button
                key={String(opt.key)}
                type="button"
                onClick={() => setLeadsOnly(opt.key)}
                className={[
                  'rounded-md px-3 py-1.5 text-caption font-medium transition-fast',
                  leadsOnly === opt.key
                    ? 'bg-brand/10 text-brand'
                    : 'text-tertiary hover:text-secondary',
                ].join(' ')}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* grid */}
      {(() => {
        const visible = leadsOnly ? students.filter((s) => s.application) : students;
        return visible.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-footnote text-tertiary">
            {leadsOnly
              ? 'Учеников с заявкой пока нет.'
              : 'Учеников пока нет. Выдайте ссылку на тест или добавьте карточку.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((s) => (
              <MiniCard key={s.id} student={s} onOpen={() => setDetail(s)} />
            ))}
          </div>
        );
      })()}

      {/* detail modal */}
      {detail && (
        <DetailModal
          student={detail}
          courses={courses}
          onClose={() => setDetail(null)}
          onLoginLink={() => createLoginLink(detail)}
          busy={busy}
        />
      )}

      {/* generated-link modal */}
      {link && <LinkModal link={link} onClose={() => setLink(null)} />}
    </div>
  );
}

/** Compact student card: grade, mini radar, account state. */
function MiniCard({ student, onOpen }: { student: StudentCard; onOpen: () => void }) {
  const result = student.scores ? computeGrade(student.scores) : null;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex flex-col items-center rounded-xl border border-border bg-surface p-5 text-center transition-fast hover:border-border-strong hover:shadow-sm"
    >
      <div className="flex h-[120px] items-center justify-center">
        {result ? (
          <RadarChart
            axes={CATEGORIES.map((c) => ({
              label: c.title,
              value: result.radar.find((r) => r.category === c.id)?.value ?? 0,
            }))}
            size={120}
            animate={false}
            showLabels={false}
          />
        ) : (
          <div className="flex h-[120px] w-[120px] items-center justify-center rounded-full border border-dashed border-border text-tertiary">
            <ClipboardList size={26} />
          </div>
        )}
      </div>
      <p className="mt-3 line-clamp-1 text-callout font-semibold text-primary">
        {student.name ?? 'Без имени'}
      </p>
      <p className="mt-0.5 text-caption text-tertiary">
        {student.grade ? (
          <span className="capitalize text-brand">
            {GRADE_LABEL[student.grade as Grade] ?? student.grade}
          </span>
        ) : (
          'тест не пройден'
        )}
        {student.takenAt ? ` · ${student.takenAt}` : ''}
      </p>
      <span
        className={[
          'mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption',
          student.hasAccount ? 'bg-brand/10 text-brand' : 'bg-muted text-tertiary',
        ].join(' ')}
      >
        {student.hasAccount ? <KeyRound size={11} /> : <UserRound size={11} />}
        {student.hasAccount ? 'есть аккаунт' : 'без входа'}
      </span>
      {student.application && (
        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-brand/40 bg-brand/10 px-2 py-0.5 text-caption font-medium text-brand">
          <Sparkles size={11} /> Заявка: {student.application.planLabel}
        </span>
      )}
    </button>
  );
}

function DetailModal({
  student,
  courses,
  onClose,
  onLoginLink,
  busy,
}: {
  student: StudentCard;
  courses: CourseOption[];
  onClose: () => void;
  onLoginLink: () => void;
  busy: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-[760px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-callout font-semibold text-primary">{student.name ?? 'Без имени'}</h3>
          <div className="flex items-center gap-2">
            {!student.hasAccount && (
              <button
                type="button"
                onClick={onLoginLink}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-caption font-medium text-on-brand transition-fast hover:opacity-90 disabled:opacity-50"
              >
                {busy ? <Loader2 size={13} className="animate-spin" /> : <KeyRound size={13} />}
                Ссылка на вход
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border bg-surface p-1.5 text-tertiary transition-fast hover:text-primary"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {student.scores && student.grade ? (
          <LearnerResultCard
            learnerId={student.id}
            name={student.name}
            grade={student.grade}
            scores={student.scores}
            takenAt={student.takenAt ?? ''}
            courses={courses}
            enrolledCourseIds={student.enrolledCourseIds}
            application={student.application}
          />
        ) : (
          <div className="rounded-xl border border-border bg-surface p-6 text-footnote text-secondary">
            Ученик ещё не проходил тест на грейд. Выдайте ссылку на тест — результат появится здесь.
          </div>
        )}
      </div>
    </div>
  );
}

function LinkModal({ link, onClose }: { link: LinkState; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — the field is selectable as a fallback */
    }
  }
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[460px] rounded-xl border border-border bg-surface p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-callout font-semibold text-primary">{link.title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-tertiary transition-fast hover:text-primary"
          >
            <X size={16} />
          </button>
        </div>
        <p className="mb-4 text-caption text-tertiary">
          Одноразовая ссылка — отправьте её ученику. После использования она перестанет работать.
        </p>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={link.url}
            onFocus={(e) => e.currentTarget.select()}
            className="min-w-0 flex-1 rounded-lg border border-border bg-canvas px-3 py-2 text-caption text-primary outline-none"
          />
          <button
            type="button"
            onClick={copy}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-footnote font-medium text-on-brand transition-fast hover:opacity-90"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? 'Скопировано' : 'Копировать'}
          </button>
        </div>
      </div>
    </div>
  );
}
