import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/shell/Sidebar';
import { APPLY_SNIPPET } from '@/lib/settings';
import { getLocale } from '@/lib/i18n/server';
import { I18nProvider } from '@/lib/i18n/client';

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
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: APPLY_SNIPPET }} />
      </head>
      <body>
        <I18nProvider initialLocale={locale}>
          <div className="flex min-h-screen flex-col md:flex-row">
            <Sidebar />
            <div className="min-w-0 flex-1 pb-28 md:pb-0">{children}</div>
          </div>
        </I18nProvider>
      </body>
    </html>
  );
}
