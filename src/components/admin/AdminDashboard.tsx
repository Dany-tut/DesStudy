'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
  Send,
  X,
} from 'lucide-react';
import { InvitesPanel, type InviteRow } from '@/components/admin/InvitesPanel';
import { useT } from '@/lib/i18n/client';

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

/** Tariff id → i18n key for its label under the `admin` namespace. */
const PLAN_LABEL_KEY: Record<string, string> = {
  self: 'admin.planSelf',
  mentor: 'admin.planMentor',
  job: 'admin.planJob',
};

/** Grade id → display label. Junior/Middle/Senior read the same in both locales. */
const GRADE_LABEL: Record<string, string> = {
  junior: 'Junior',
  middle: 'Middle',
  senior: 'Senior',
};

const STATUS_FLOW: { value: string; labelKey: string }[] = [
  { value: 'new', labelKey: 'admin.statusNew' },
  { value: 'contacted', labelKey: 'admin.statusContacted' },
  { value: 'closed', labelKey: 'admin.statusClosed' },
  { value: 'spam', labelKey: 'admin.statusSpam' },
];

type TabKey = 'users' | 'applications' | 'payments' | 'analytics' | 'errors';

const TABS: { key: TabKey; labelKey: string; icon: typeof Users }[] = [
  { key: 'users', labelKey: 'admin.tabUsers', icon: Users },
  { key: 'applications', labelKey: 'admin.tabApplications', icon: Inbox },
  { key: 'payments', labelKey: 'admin.tabPayments', icon: CreditCard },
  { key: 'analytics', labelKey: 'admin.tabAnalytics', icon: BarChart3 },
  { key: 'errors', labelKey: 'admin.tabErrors', icon: TriangleAlert },
];

// ── Top-level ────────────────────────────────────────────────────────────────

const TAB_KEYS = TABS.map((t) => t.key);

function readTabFromHash(): TabKey {
  if (typeof window === 'undefined') return 'users';
  const hash = window.location.hash.replace(/^#/, '') as TabKey;
  return TAB_KEYS.includes(hash) ? hash : 'users';
}

export function AdminDashboard({ data }: { data: AdminData }) {
  const { t } = useT();
  const [tab, setTabState] = useState<TabKey>('users');
  const newLeads = data.applications.filter((a) => a.status === 'new').length;

  // Restore the active tab from the URL hash on mount (survives F5) and keep
  // in sync when the user navigates with the browser back/forward buttons.
  useEffect(() => {
    setTabState(readTabFromHash());
    const onHashChange = () => setTabState(readTabFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const setTab = (key: TabKey) => {
    setTabState(key);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${key}`);
    }
  };

  return (
    <div>
      {/* Tab bar */}
      <div className="mb-8 flex flex-wrap gap-1 rounded-full border border-border bg-surface p-1">
        {TABS.map(({ key, labelKey, icon: Icon }) => {
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
              {t(labelKey)}
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
  const { t } = useT();
  const { stats, teachers, invites } = data;
  const tiles = [
    { icon: Users, label: t('admin.tileTeachers'), value: stats.teacherCount },
    { icon: GraduationCap, label: t('admin.tileStudents'), value: stats.learnerCount },
    { icon: ClipboardCheck, label: t('admin.tileTestsPassed'), value: stats.assessmentCount },
    { icon: BookOpen, label: t('admin.tileLessonsCreated'), value: stats.lessonCount },
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
          {t('admin.teachersHeading')}
        </h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          {teachers.length === 0 ? (
            <p className="px-5 py-6 text-body text-tertiary">{t('admin.noAccounts')}</p>
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
                  {tch.role === 'BOSS' ? t('admin.roleBoss') : t('admin.roleTeacher')}
                </span>
                <span className="shrink-0 text-footnote tabular-nums text-secondary">
                  {t('admin.studentsShort', { count: tch.learnerCount })}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-callout font-semibold text-primary">{t('admin.invitesHeading')}</h2>
        <InvitesPanel initial={invites} />
      </section>
    </div>
  );
}

// ── Applications tab (leads pipeline) ────────────────────────────────────────

function ApplicationsTab({ initial }: { initial: ApplicationRow[] }) {
  const { t } = useT();
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
      <EmptyState icon={Inbox} title={t('admin.appsEmptyTitle')} body={t('admin.appsEmptyBody')} />
    );
  }

  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-callout font-semibold text-primary">
        {t('admin.appsHeading')}
        {newCount > 0 && (
          <span className="rounded-full bg-brand/10 px-2 py-0.5 text-caption font-medium text-brand">
            {t('admin.appsNewBadge', { count: newCount })}
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
  const { t, locale } = useT();
  const [copied, setCopied] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const tg = row.telegram?.replace(/^@/, '').trim() || null;
  const tgUrl = tg ? `https://t.me/${tg}` : null;
  const date = useMemo(
    () =>
      new Date(row.createdAt).toLocaleString(locale, {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [row.createdAt, locale],
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
            <span className="text-body font-semibold text-primary">{row.name || t('admin.appNoName')}</span>
            <span className="text-caption text-tertiary">{date}</span>
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-caption text-secondary">
              {PLAN_LABEL_KEY[row.plan] ? t(PLAN_LABEL_KEY[row.plan]) : row.plan}
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
                aria-label={t('admin.copyTgAria')}
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

          <button
            type="button"
            onClick={() => setChatOpen((o) => !o)}
            aria-expanded={chatOpen}
            className={[
              'mt-3 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-footnote transition-base',
              chatOpen
                ? 'border-brand bg-brand/5 text-brand'
                : 'border-border text-secondary hover:border-border-strong hover:text-primary',
            ].join(' ')}
          >
            <MessageCircle size={14} />
            {chatOpen ? t('admin.hideChat') : t('admin.writeChat')}
          </button>
        </div>

        {/* Status pipeline */}
        <div className="flex shrink-0 rounded-lg border border-border bg-canvas p-0.5">
          {STATUS_FLOW.map((s) => {
            const active = row.status === s.value;
            const label = t(s.labelKey);
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
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {chatOpen && <ChatPanel applicationId={row.id} name={row.name} />}
    </div>
  );
}

// ── In-admin curator↔applicant chat ──────────────────────────────────────────

interface ChatMessageRow {
  id: string;
  direction: string; // 'in' | 'out'
  text: string;
  createdAt: string;
}

/**
 * The conversation behind one заявка, opened inline in its card. Loads history
 * from /api/admin/applications/[id]/messages and polls it every few seconds so
 * the applicant's Telegram replies show up without a refresh. Sending posts to
 * the same route, which relays over the bot.
 *
 * When the applicant hasn't pressed Start on the bot yet there's no chat id to
 * message, so we show the deep link to share instead of the composer.
 */
function ChatPanel({ applicationId, name }: { applicationId: string; name: string | null }) {
  const { t } = useT();
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [connected, setConnected] = useState(false);
  const [chatLink, setChatLink] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Load once, then poll for inbound replies while the panel stays open.
  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch(`/api/admin/applications/${applicationId}/messages`);
        if (!res.ok) throw new Error('failed');
        const data = (await res.json()) as {
          connected: boolean;
          chatLink: string | null;
          messages: ChatMessageRow[];
        };
        if (!alive) return;
        setMessages(data.messages);
        setConnected(data.connected);
        setChatLink(data.chatLink);
        setLoaded(true);
      } catch {
        if (alive) setLoaded(true);
      }
    }
    load();
    const timer = setInterval(load, 4000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [applicationId]);

  // Keep the newest message in view as history grows.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/applications/${applicationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (res.status === 409) {
        setConnected(false);
        setError(t('admin.chatNotConnectedError'));
        return;
      }
      if (!res.ok) throw new Error('failed');
      const data = (await res.json()) as { message: ChatMessageRow };
      setMessages((m) => [...m, data.message]);
      setDraft('');
    } catch {
      setError(t('admin.chatSendError'));
    } finally {
      setSending(false);
    }
  }

  function copyLink() {
    if (!chatLink) return;
    navigator.clipboard?.writeText(chatLink).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1500);
    });
  }

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-border bg-canvas">
      <div className="border-b border-border px-4 py-2.5 text-caption font-medium text-secondary">
        {t('admin.chatWith', { name: name || t('admin.chatWithFallback') })}
        {!connected && loaded && (
          <span className="ml-2 rounded-full bg-warning/10 px-2 py-0.5 text-caption font-normal text-warning">
            {t('admin.botNotConnected')}
          </span>
        )}
      </div>

      {/* Not connected: nothing to message yet — share the deep link. */}
      {loaded && !connected ? (
        <div className="px-4 py-4 text-footnote text-secondary">
          <p>{t('admin.chatConnectHint')}</p>
          {chatLink ? (
            <div className="mt-3 flex items-center gap-2">
              <a
                href={chatLink}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate rounded-lg border border-border bg-surface px-3 py-1.5 text-caption text-brand hover:border-border-strong"
              >
                {chatLink}
              </a>
              <button
                type="button"
                onClick={copyLink}
                aria-label={t('admin.copyLinkAria')}
                className="shrink-0 rounded p-1 text-tertiary transition-base hover:text-secondary"
              >
                {linkCopied ? <Check size={14} className="text-brand" /> : <Copy size={14} />}
              </button>
            </div>
          ) : (
            <p className="mt-2 text-caption text-tertiary">{t('admin.linkUnavailable')}</p>
          )}
        </div>
      ) : (
        <>
          <div
            ref={scrollRef}
            className="slim-scroll flex max-h-64 flex-col gap-2 overflow-y-auto px-4 py-3"
          >
            {!loaded ? (
              <p className="py-6 text-center text-caption text-tertiary">{t('admin.chatLoading')}</p>
            ) : messages.length === 0 ? (
              <p className="py-6 text-center text-caption text-tertiary">{t('admin.chatNoMessages')}</p>
            ) : (
              messages.map((m) => <ChatBubble key={m.id} msg={m} />)
            )}
          </div>

          <div className="flex items-end gap-2 border-t border-border p-3">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder={t('admin.chatPlaceholder')}
              className="min-h-[38px] max-h-28 flex-1 resize-none rounded-lg border border-border bg-surface px-3 py-2 text-footnote text-primary outline-none transition-base focus:border-brand"
            />
            <button
              type="button"
              onClick={send}
              disabled={sending || draft.trim() === ''}
              aria-label={t('admin.sendAria')}
              className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg bg-brand text-on-brand transition-base hover:bg-brand-hover disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </div>
        </>
      )}

      {error && (
        <div className="flex items-center gap-1.5 border-t border-border px-4 py-2 text-caption text-danger">
          <X size={13} />
          {error}
        </div>
      )}
    </div>
  );
}

function ChatBubble({ msg }: { msg: ChatMessageRow }) {
  const { locale } = useT();
  const out = msg.direction === 'out';
  const time = new Date(msg.createdAt).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <div className={out ? 'flex justify-end' : 'flex justify-start'}>
      <div
        className={[
          'max-w-[78%] rounded-2xl px-3 py-2 text-footnote',
          out
            ? 'rounded-br-sm bg-brand text-on-brand'
            : 'rounded-bl-sm bg-surface text-primary border border-border',
        ].join(' ')}
      >
        <div className="whitespace-pre-wrap break-words">{msg.text}</div>
        <div className={['mt-0.5 text-right text-caption', out ? 'text-on-brand/70' : 'text-tertiary'].join(' ')}>
          {time}
        </div>
      </div>
    </div>
  );
}

// ── Payments tab (internal purchases / upgrades — not wired yet) ─────────────

function PaymentsTab() {
  const { t } = useT();
  return (
    <EmptyState
      icon={CreditCard}
      title={t('admin.paymentsEmptyTitle')}
      body={t('admin.paymentsEmptyBody')}
    />
  );
}

// ── Analytics tab (aggregates) ───────────────────────────────────────────────

function AnalyticsTab({ data }: { data: AdminData }) {
  const { t } = useT();
  const { stats, applications, gradeDistribution } = data;
  const totalGrades = gradeDistribution.junior + gradeDistribution.middle + gradeDistribution.senior;
  const leadsByPlan = STATUS_PLAN_COUNTS(applications);
  const conversion = stats.learnerCount > 0 ? (applications.length / stats.learnerCount) * 100 : 0;

  const kpis = [
    { label: t('admin.kpiTotalApps'), value: applications.length },
    { label: t('admin.kpiConversion'), value: `${conversion.toFixed(0)}%` },
    { label: t('admin.kpiTestsPassed'), value: stats.assessmentCount },
    { label: t('admin.kpiStudents'), value: stats.learnerCount },
  ];

  return (
    <div className="space-y-6">
      <p className="text-footnote text-tertiary">{t('admin.analyticsIntro')}</p>

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
          title={t('admin.distroGrades')}
          rows={[
            { label: 'Junior', value: gradeDistribution.junior, total: totalGrades },
            { label: 'Middle', value: gradeDistribution.middle, total: totalGrades },
            { label: 'Senior', value: gradeDistribution.senior, total: totalGrades },
          ]}
          empty={t('admin.distroGradesEmpty')}
        />
        <DistroCard
          title={t('admin.distroPlans')}
          rows={[
            { label: t('admin.planSelf'), value: leadsByPlan.self, total: applications.length },
            { label: t('admin.planMentor'), value: leadsByPlan.mentor, total: applications.length },
            { label: t('admin.planJob'), value: leadsByPlan.job, total: applications.length },
          ]}
          empty={t('admin.distroPlansEmpty')}
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
  const { t } = useT();
  return (
    <EmptyState
      icon={TriangleAlert}
      title={t('admin.errorsEmptyTitle')}
      body={t('admin.errorsEmptyBody')}
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
