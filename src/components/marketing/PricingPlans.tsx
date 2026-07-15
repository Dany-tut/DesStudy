import Link from 'next/link';
import { Check, ArrowRight } from 'lucide-react';

/**
 * Guest-facing tariff cards. Placeholder pricing/packages shown to a learner who
 * has finished the grading test but isn't enrolled yet — their grade is saved
 * for the curator, and here they can see the packages and jump to the landing
 * (itself a stub for now). A teacher links the purchased course to the student
 * later, which flips them to a registered learner with the full app.
 */

interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  tagline: string;
  features: string[];
  featured?: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'self',
    name: 'Самостоятельно',
    price: '4 990 ₽',
    period: 'разовый доступ',
    tagline: 'Все уроки и интерактивные задания платформы',
    features: ['Полный курс UI/UX', 'Интерактивные тренажёры', 'Тест на грейд и точки роста'],
  },
  {
    id: 'mentor',
    name: 'С ментором',
    price: '19 900 ₽',
    period: 'за месяц',
    tagline: 'Платформа + разбор работ и созвоны с куратором',
    features: [
      'Всё из «Самостоятельно»',
      'Ревью портфолио и заданий',
      'Личные созвоны с ментором',
      'Проверка тестовых и подготовка к собесам',
    ],
    featured: true,
  },
  {
    id: 'job',
    name: 'До оффера',
    price: 'по заявке',
    period: 'до трудоустройства',
    tagline: 'Ведём до выхода на работу дизайнером',
    features: ['Всё из «С ментором»', 'Сборка портфолио-кейсов', 'Карьерный трек и отклики', 'Поддержка до оффера'],
  },
];

export function PricingPlans() {
  return (
    <section className="mx-auto mt-16 max-w-[980px]">
      <div className="text-center">
        <h2 className="text-title1 font-bold text-primary">Как продолжить обучение</h2>
        <p className="mx-auto mt-2 max-w-[520px] text-body text-secondary">
          Ваш грейд сохранён — куратор его уже видит. Выберите формат, и мы откроем доступ к платформе с
          персональными точками роста.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => (
          <div
            key={p.id}
            className={[
              'flex flex-col rounded-2xl border p-6 transition-base',
              p.featured
                ? 'border-brand/60 bg-brand/5 shadow-[0_0_0_1px_var(--brand)]'
                : 'border-border bg-surface',
            ].join(' ')}
          >
            {p.featured && (
              <span className="mb-3 inline-flex w-fit rounded-full bg-brand px-2.5 py-1 text-caption font-medium text-on-brand">
                Популярный
              </span>
            )}
            <h3 className="text-callout font-semibold text-primary">{p.name}</h3>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-title2 font-bold text-primary tabular-nums">{p.price}</span>
              <span className="text-footnote text-tertiary">{p.period}</span>
            </div>
            <p className="mt-2 text-footnote text-secondary">{p.tagline}</p>
            <ul className="mt-4 space-y-2">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-footnote text-secondary">
                  <Check size={15} className="mt-0.5 shrink-0 text-brand" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/landing"
              className={[
                'mt-6 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-footnote font-medium transition-base',
                p.featured
                  ? 'bg-brand text-on-brand hover:bg-brand-hover'
                  : 'border border-border text-primary hover:border-brand',
              ].join(' ')}
            >
              Оставить заявку <ArrowRight size={15} />
            </Link>
          </div>
        ))}
      </div>

      <p className="mt-6 text-center text-caption text-tertiary">
        Оплата и тарифы — черновик. Позже подключим лендинг и реальную оплату.
      </p>
    </section>
  );
}
