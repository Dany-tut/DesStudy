import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/shell/Sidebar';
import { APPLY_SNIPPET } from '@/lib/settings';

export const metadata: Metadata = {
  title: 'DesStudy — Interactive Design Learning OS',
  description:
    'Become a professional UI/UX designer by doing: interactive practice, instant validation, AI mentoring.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: APPLY_SNIPPET }} />
      </head>
      <body>
        <div className="flex min-h-screen flex-col md:flex-row">
          <Sidebar />
          <div className="min-w-0 flex-1 pb-28 md:pb-0">{children}</div>
        </div>
      </body>
    </html>
  );
}
