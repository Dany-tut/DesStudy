import type { Metadata } from 'next';
import { headers } from 'next/headers';
import './globals.css';
import { Sidebar } from '@/components/shell/Sidebar';
import { TopHeader } from '@/components/shell/TopHeader';
import { APPLY_SNIPPET } from '@/lib/settings';
import { getLocale } from '@/lib/i18n/server';
import { I18nProvider } from '@/lib/i18n/client';
import { getSessionLearner } from '@/lib/learner';
import { getSessionUser } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'DesStudy — Interactive Design Learning OS',
  description:
    'Become a professional UI/UX designer by doing: interactive practice, instant validation, AI mentoring.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = (await headers()).get('x-pathname') ?? '';

  // Focused, single-purpose flows render bare — no app chrome at all. A student
  // sitting a test or a visitor claiming an invite should see only that screen,
  // never the staff/learner navigation (which also wrongly leaked in when a
  // signed-in curator opened a public test link).
  const BARE_PREFIXES = ['/signin', '/test', '/join', '/invite', '/assessment', '/landing'];
  const isBare = BARE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  const [locale, staffUser, learner] = await Promise.all([
    getLocale(),
    getSessionUser(),
    getSessionLearner(),
  ]);

  const staff = staffUser
    ? {
        name: staffUser.name || staffUser.email,
        role: staffUser.role,
        roleLabel: staffUser.role === 'BOSS' ? 'админ' : 'препод',
      }
    : null;

  // Learner-only areas — the paid course (kept in sync with middleware.ts).
  // On these routes the learner shell wins even if a staff session also exists
  // in the same browser; otherwise an admin who is also enrolled as a student
  // would see the staff nav bleed onto their /student pages.
  const LEARNER_PREFIXES = ['/student', '/learn', '/dashboard', '/achievements', '/library', '/mentor'];
  const onLearnerRoute = LEARNER_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // A signed-in student (learner session) gets the full app Sidebar; staff and
  // anonymous visitors get the header shell instead. Route context breaks the
  // tie when both a staff and a learner session are present at once.
  const isStudent = !!learner && (onLearnerRoute || !staff);

  // Identity shown in the sidebar's user menu.
  const learnerUser = {
    name: learner?.name || learner?.email || 'Ученик',
    subtitle: learner?.email ?? undefined,
  };

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: APPLY_SNIPPET }} />
      </head>
      <body>
        <I18nProvider initialLocale={locale}>
          {isBare ? (
            // Focused flows (test / sign-in / invite) — content only, no chrome.
            children
          ) : isStudent ? (
            // Signed-in students get the app Sidebar.
            <div className="flex min-h-screen flex-col md:flex-row">
              <Sidebar user={learnerUser} />
              <div className="min-w-0 flex-1 pb-28 md:pb-0">{children}</div>
            </div>
          ) : (
            // Staff and anonymous visitors get the header shell, full-width.
            <div className="min-h-screen">
              <TopHeader staff={staff} />
              {children}
            </div>
          )}
        </I18nProvider>
      </body>
    </html>
  );
}
