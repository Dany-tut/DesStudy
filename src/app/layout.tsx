import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/shell/Sidebar';
import { APPLY_SNIPPET } from '@/lib/settings';
import { getLocale } from '@/lib/i18n/server';
import { I18nProvider } from '@/lib/i18n/client';
import { isRegisteredLearner } from '@/lib/learner';

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
  const [locale, registered] = await Promise.all([getLocale(), isRegisteredLearner()]);

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: APPLY_SNIPPET }} />
      </head>
      <body>
        <I18nProvider initialLocale={locale}>
          {/* Guests (not yet enrolled by a teacher) see the marketing shell with
              no app sidebar — just their content full-width. */}
          {registered ? (
            <div className="flex min-h-screen flex-col md:flex-row">
              <Sidebar />
              <div className="min-w-0 flex-1 pb-28 md:pb-0">{children}</div>
            </div>
          ) : (
            <div className="min-h-screen">{children}</div>
          )}
        </I18nProvider>
      </body>
    </html>
  );
}
