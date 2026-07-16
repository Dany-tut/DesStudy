'use client';

import { useMemo, useState } from 'react';
import {
  Users,
  GraduationCap,
  ClipboardCheck,
  BookOpen,
  Inbox,
  BarChart3,
  TriangleAlert,
  CreditCard,
  Copy,
  Check,
  MessageCircle,
  Phone,
} from 'lucide-react';
import { InvitesPanel, type InviteRow } from '@/components/admin/InvitesPanel';

/**
 * Client shell for the BOSS admin hub. The server page (admin/page.tsx) loads
 * everything and hands it here; this splits the view into tabs like the
 * reference «Организаторы и статистика» screen: Пользователи (roster + invites +
 * KPI), Заявки (leads from «оставить заявку», with a status pipeline),
 * Аналитика (aggregates), and Ошибки (feedback/error inbox — not wired yet).
 */

// ── Shared data shapes (all serialisable from the server component) ──────────

export interface TeacherRow {
  id: string;
  name: string | null;
  email: string;
  role: 'BOSS' | 'TEACHER';
  learnerCount: number;
}

export interface ApplicationRow {
  id: string;
  name: string | null;
  telegram: string | null;
  phone: string | null;
  plan: string;
  status: string;
  grade: string | null;
  createdAt: string; // ISO
}

export interface AdminData {
  stats: { teacherCount: number; learnerCount: number; assessmentCount: number; lessonCount: number };
  teachers: TeacherRow[];
  invites: InviteRow[];
  applications: ApplicationRow[];
  gradeDistribution: { junior: number; middle: number; senior: number };
}

// ── Label maps ───────────────────────────────────────────────────────────────

const PLAN_LABEL: Record<string, string> = {
  self: 'Самостоятельно',
  mentor: 'С ментором',
  job: 'До оффера',
};

const GRADE_LABEL: Record<string, string> = {
  junior: 'Junior',
  middle: 'Middle',
  senior: 'Senior',
};

const STATUS_FLOW: { value: string; label: string }[] = [
  { value: 'new', label: 'Новая' },
  { value: 'contacted', label: 'Связались' },
  { value: 'closed', label: 'Готово' },
  { value: 'spam', label: 'Спам' },
];

type TabKey = 'users' | 'applications' | 'payments' | 'analytics' | 'errors';

const TABS: { key: TabKey; label: string; icon: typeof Users }[] = [
  { key: 'users', label: 'Пользователи', icon: Users },
  { key: 'applications', label: 'Заявки', icon: Inbox },
  { key: 'payments', label: 'Оплаты', icon: CreditCard },
  { key: 'analytics', label: 'Аналитика', icon: BarChart3 },
  { key: 'errors', label: 'Ошибки', icon: TriangleAlert },
];

// ── Top-level ────────────────────────────────────────────────────────────────

export function AdminDashboard({ data }: { data: AdminData }) {
  const [tab, setTab] = useState<TabKey>('users');
  const newLeads = data.applications.filter((a) => a.status === 'new').length;

  return (
    <div>
      {/* Tab bar */}
      <div className="mb-8 flex flex-wrap gap-1 rounded-full border border-border bg-surface p-1">
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = tab === key;
          const badge = key === 'applications' && newLeads > 0 ? newLeads : null;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={[
                'flex items-center gap-2 rounded-full px-4 py-2 text-footnote font-medium transition-base',
                active ? 'bg-brand text-on-brand' : 'text-secondary hover:bg-hover hover:text-primary',
              ].join(' ')}
            >
              <Icon size={16} />
              {label}
              {badge != null && (
                <span
                  className={[
                    'rounded-full px-1.5 py-0.5 text-caption font-semibold tabular-nums',
                    active ? 'bg-on-brand/20 text-on-brand' : 'bg-brand/10 text-brand',
                  ].join(' ')}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === 'users' && <UsersTab data={data} />}
      {tab === 'applications' && <ApplicationsTab initial={data.applications} />}
      {tab === 'payments' && <PaymentsTab />}
      {tab === 'analytics' && <AnalyticsTab data={data} />}
      {tab === 'errors' && <ErrorsTab />}
    </div>
  );
}

// ── Users tab (former hub content) ───────────────────────────────────────────

function UsersTab({ data }: { data: AdminData }) {
  const { stats, teachers, invites } = data;
  const tiles = [
    { icon: Users, label: 'Преподаватели', value: stats.teacherCount },
    { icon: GraduationCap, label: 'Ученики', value: stats.learnerCount },
    { icon: ClipboardCheck, label: 'Тестов сдано', value: stats.assessmentCount },
    { icon: BookOpen, label: 'Уроков создано', value: stats.lessonCount },
  ];

  return (
    <div>
      <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-2xl border border-border bg-surface p-5">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <Icon size={18} />
            </div>
            <div className="text-title1 font-bold tabular-nums text-primary">{value}</div>
            <div className="mt-0.5 text-footnote text-secondary">{label}</div>
          </div>
        ))}
      </div>

      <section className="mb-10">
        <h2 className="mb-3 flex items-center gap-2 text-callout font-semibold text-primary">
          <Users size={18} className="text-secondary" />
          Преподаватели
        </h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          {teachers.length === 0 ? (
            <p className="px-5 py-6 text-body text-tertiary">Пока нет ни одного аккаунта.</p>
          ) : (
            teachers.map((tch, i) => (
              <div
                key={tch.id}
                className={`flex items-center gap-4 px-5 py-4 ${i > 0 ? 'border-t border-border' : ''}`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-footnote font-semibold text-secondary">
                  {(tch.name || tch.email).slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-body font-medium text-primary">{tch.name || tch.email}</div>
                  <div className="truncate text-caption text-tertiary">{tch.email}</div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-caption font-medium ${
                    tch.role === 'BOSS' ? 'bg-brand/10 text-brand' : 'bg-muted text-secondary'
                  }`}
                >
                  {tch.role === 'BOSS' ? 'админ' : 'препод'}
                </span>
                <span className="shrink-0 text-footnote tabular-nums text-secondary">
                  {tch.learnerCount} уч.
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-callout font-semibold text-primary">Приглашения</h2>
        <InvitesPanel initial={invites} />
      </section>
    </div>
  );
}

// ── Applications tab (leads pipeline) ────────────────────────────────────────

function ApplicationsTab({ initial }: { initial: ApplicationRow[] }) {
  const [rows, setRows] = useState(initial);

  const newCount = rows.filter((r) => r.status === 'new').length;

  async function setStatus(id: string, status: string) {
    const prev = rows;
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r))); // optimistic
    try {
      const res = await fetch(`/api/admin/applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('failed');
    } catch {
      setRows(prev); // roll back
    }
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="Заявок пока нет"
        body="Внешние лиды: заявки, которые ученики оставляют на экране тарифов («Оставить заявку»). Внутренние покупки и апгрейды — во вкладке «Оплаты»."
      />
    );
  }

  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-callout font-semibold text-primary">
        Заявки
        {newCount > 0 && (
          <span className="rounded-full bg-brand/10 px-2 py-0.5 text-caption font-medium text-brand">
            {newCount} новых
          </span>
        )}
      </h2>
      <div className="space-y-3">
        {rows.map((r) => (
          <ApplicationCard key={r.id} row={r} onStatus={setStatus} />
        ))}
      </div>
    </section>
  );
}

function ApplicationCard({
  row,
  onStatus,
}: {
  row: ApplicationRow;
  onStatus: (id: string, status: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const tg = row.telegram?.replace(/^@/, '').trim() || null;
  const tgUrl = tg ? `https://t.me/${tg}` : null;
  const date = useMemo(
    () =>
      new Date(row.createdAt).toLocaleString('ru-RU', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [row.createdAt],
  );

  function copyTg() {
    if (!row.telegram) return;
    navigator.clipboard?.writeText(row.telegram).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-body font-semibold text-primary">{row.name || 'Без имени'}</span>
            <span className="text-caption text-tertiary">{date}</span>
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-caption text-secondary">
              {PLAN_LABEL[row.plan] ?? row.plan}
            </span>
            {row.grade && (
              <span className="rounded-md bg-brand/10 px-1.5 py-0.5 text-caption font-medium text-brand">
                {GRADE_LABEL[row.grade] ?? row.grade}
              </span>
            )}
          </div>

          {row.telegram && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <a
                href={tgUrl ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-footnote font-medium text-brand hover:underline"
              >
                {row.telegram.startsWith('@') ? row.telegram : `@${row.telegram}`}
              </a>
              <button
                type="button"
                onClick={copyTg}
                aria-label="Скопировать Telegram"
                className="rounded p-0.5 text-tertiary transition-base hover:text-secondary"
              >
                {copied ? <Check size={13} className="text-brand" /> : <Copy size={13} />}
              </button>
            </div>
          )}
          {row.phone && (
            <a
              href={`tel:${row.phone}`}
              className="mt-1 flex items-center gap-1.5 text-footnote text-secondary hover:text-primary"
            >
              <Phone size={13} className="text-tertiary" />
              {row.phone}
            </a>
          )}

          {tgUrl && (
            <a
              href={tgUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-footnote text-secondary transition-base hover:border-border-strong hover:text-primary"
            >
              <MessageCircle size={14} />
              Написать в чат
            </a>
          )}
        </div>

        {/* Status pipeline */}
        <div className="flex shrink-0 rounded-lg border border-border bg-canvas p-0.5">
          {STATUS_FLOW.map((s) => {
            const active = row.status === s.value;
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => onStatus(row.id, s.value)}
                aria-pressed={active}
                className={[
                  'rounded-md px-3 py-1.5 text-footnote transition-base',
                  active
                    ? s.value === 'spam'
                      ? 'bg-danger/10 font-medium text-danger'
                      : 'bg-surface font-medium text-primary shadow-sm'
                    : 'text-tertiary hover:text-secondary',
                ].join(' ')}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Payments tab (internal purchases / upgrades — not wired yet) ─────────────

function PaymentsTab() {
  return (
    <EmptyState
      icon={CreditCard}
      title="Оплаты и апгрейды"
      body="Внутренние покупки: оплаты доступа и апгрейды тарифа внутри платформы. Приём оплат пока не подключён — появится вместе с биллингом. Внешние лиды — во вкладке «Заявки»."
    />
  );
}

// ── Analytics tab (aggregates) ───────────────────────────────────────────────

function AnalyticsTab({ data }: { data: AdminData }) {
  const { stats, applications, gradeDistribution } = data;
  const totalGrades = gradeDistribution.junior + gradeDistribution.middle + gradeDistribution.senior;
  const leadsByPlan = STATUS_PLAN_COUNTS(applications);
  const conversion = stats.learnerCount > 0 ? (applications.length / stats.learnerCount) * 100 : 0;

  const kpis = [
    { label: 'Всего заявок', value: applications.length },
    { label: 'Конверсия в заявку', value: `${conversion.toFixed(0)}%` },
    { label: 'Тестов сдано', value: stats.assessmentCount },
    { label: 'Учеников', value: stats.learnerCount },
  ];

  return (
    <div className="space-y-6">
      <p className="text-footnote text-tertiary">
        Сводка по обратной связи, которая формируется из активности сервиса. Полноценные графики появятся
        позже — пока агрегаты по имеющимся данным.
      </p>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-border bg-surface p-5">
            <div className="text-title1 font-bold tabular-nums text-primary">{k.value}</div>
            <div className="mt-0.5 text-footnote text-secondary">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <DistroCard
          title="Грейды учеников"
          rows={[
            { label: 'Junior', value: gradeDistribution.junior, total: totalGrades },
            { label: 'Middle', value: gradeDistribution.middle, total: totalGrades },
            { label: 'Senior', value: gradeDistribution.senior, total: totalGrades },
          ]}
          empty="Тесты ещё не сдавали."
        />
        <DistroCard
          title="Заявки по тарифам"
          rows={[
            { label: 'Самостоятельно', value: leadsByPlan.self, total: applications.length },
            { label: 'С ментором', value: leadsByPlan.mentor, total: applications.length },
            { label: 'До оффера', value: leadsByPlan.job, total: applications.length },
          ]}
          empty="Заявок пока нет."
        />
      </div>
    </div>
  );
}

function STATUS_PLAN_COUNTS(apps: ApplicationRow[]) {
  return apps.reduce(
    (acc, a) => {
      if (a.plan === 'self' || a.plan === 'mentor' || a.plan === 'job') acc[a.plan] += 1;
      return acc;
    },
    { self: 0, mentor: 0, job: 0 },
  );
}

function DistroCard({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: { label: string; value: number; total: number }[];
  empty: string;
}) {
  const total = rows.reduce((s, r) => s + r.value, 0);
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h3 className="mb-4 text-footnote font-semibold text-primary">{title}</h3>
      {total === 0 ? (
        <p className="text-footnote text-tertiary">{empty}</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const pct = r.total > 0 ? Math.round((r.value / r.total) * 100) : 0;
            return (
              <div key={r.label}>
                <div className="mb-1 flex items-center justify-between text-caption text-secondary">
                  <span>{r.label}</span>
                  <span className="tabular-nums">
                    {r.value} · {pct}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Errors tab (feedback inbox — not wired yet) ──────────────────────────────

function ErrorsTab() {
  return (
    <EmptyState
      icon={TriangleAlert}
      title="Обратная связь и ошибки"
      body="Сюда будут прилетать сообщения об ошибках и обратная связь от пользователей. Сбор пока не подключён — появится вместе с формой обратной связи."
    />
  );
}

// ── Shared ───────────────────────────────────────────────────────────────────

function EmptyState({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Users;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-secondary">
        <Icon size={22} />
      </div>
      <h3 className="text-callout font-semibold text-primary">{title}</h3>
      <p className="mt-1.5 max-w-[420px] text-footnote text-secondary">{body}</p>
    </div>
  );
}
