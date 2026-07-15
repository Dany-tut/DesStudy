import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PricingPlans } from '@/components/marketing/PricingPlans';

export const dynamic = 'force-dynamic';

/**
 * Landing placeholder. A real marketing landing page will be assembled here
 * later; for now it's a stub so guest CTAs have somewhere to go and we don't
 * forget to build it. Reuses the pricing block.
 */
export default function LandingPage() {
  return (
    <main className="mx-auto max-w-[980px] px-6 py-16">
      <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-10 text-center">
        <span className="text-caption uppercase tracking-widest text-tertiary">Черновик</span>
        <h1 className="mt-2 text-display font-bold text-primary">DesStudy</h1>
        <p className="mx-auto mt-3 max-w-[560px] text-body text-secondary">
          Здесь будет лендинг: оффер, программа, отзывы и результаты учеников. Пока это заглушка —
          соберём позже. Ниже — черновик тарифов.
        </p>
        <Link
          href="/assessment"
          className="mt-6 inline-flex items-center gap-1.5 text-footnote text-tertiary transition-fast hover:text-secondary"
        >
          <ArrowLeft size={15} /> Вернуться к тесту
        </Link>
      </div>

      <PricingPlans />
    </main>
  );
}
