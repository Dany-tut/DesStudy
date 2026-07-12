import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

/** Placeholder for modules that are on the roadmap but not built yet. */
export function ComingSoon({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-[560px] flex-col items-center justify-center px-6 text-center">
      <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand">
        {icon}
      </span>
      <h1 className="text-title1 font-bold text-primary">{title}</h1>
      <p className="mt-3 text-body text-secondary">{description}</p>
      <span className="mt-5 rounded-full bg-muted px-3 py-1 text-footnote text-tertiary">
        В разработке
      </span>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 text-footnote font-medium text-brand hover:underline"
      >
        <ArrowLeft size={15} /> На главную
      </Link>
    </main>
  );
}
