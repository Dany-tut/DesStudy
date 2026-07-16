import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { PlatformShowcase } from '@/components/marketing/PlatformShowcase';
import { PlatformFeatures } from '@/components/marketing/PlatformFeatures';
import { GradeTestPromo } from '@/components/marketing/GradeTestPromo';
import { PricingPlans } from '@/components/marketing/PricingPlans';
import { ForceLightTheme } from '@/components/marketing/ForceLightTheme';

export const dynamic = 'force-dynamic';

/**
 * Marketing landing. Structure: a calm hero statement of the offer, then the
 * interactive "Figma" showcase where the platform's modes live as layers you
 * can actually play with, then the grading-test funnel, then pricing.
 */
export default function LandingPage() {
  return (
    <main className="mx-auto max-w-[980px] px-6 py-20 md:py-28">
      <ForceLightTheme />
      {/* Hero — the beautiful centred statement */}
      <section className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-caption font-medium text-secondary">
          <Sparkles size={13} className="text-brand" />
          Duolingo × LeetCode для UI/UX
        </span>
        <h1 className="mx-auto mt-5 max-w-[760px] text-display font-bold leading-[1.05] tracking-tight text-primary">
          Учись дизайну{' '}— <span className="text-brand">делая</span>,<br />а не смотря видео
        </h1>
        <p className="mx-auto mt-5 max-w-[600px] text-title3 font-normal leading-relaxed text-secondary">
          Интерактивная платформа, где каждое правило дизайна ты сразу применяешь руками. Мгновенная
          валидация макета и AI-ментор, который ведёт к ответу, а не выдаёт его.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/assessment"
            className="group inline-flex items-center gap-2 rounded-lg bg-brand px-6 py-3 text-callout font-medium text-on-brand transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-brand-hover hover:shadow-lg hover:shadow-brand/25 active:translate-y-0 active:scale-[0.98] active:shadow-md"
          >
            Пройти тест на грейд{' '}
            <ArrowRight size={16} className="transition-transform duration-200 ease-out group-hover:translate-x-1" />
          </Link>
          <Link
            href="/learn"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-6 py-3 text-callout font-medium text-primary transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-brand/40 hover:bg-hover hover:shadow-md active:translate-y-0 active:scale-[0.98] active:shadow-sm"
          >
            Смотреть программу
          </Link>
        </div>
      </section>

      {/* Interactive showcase — breaks out wider than the text column */}
      <section className="mt-16 lg:mx-[-90px]">
        <p className="mb-5 text-center text-footnote text-tertiary">
          Потрогай платформу прямо здесь — переключай слои-режимы
        </p>
        <PlatformShowcase />
      </section>

      <PlatformFeatures />

      <GradeTestPromo />

      <PricingPlans />
    </main>
  );
}
