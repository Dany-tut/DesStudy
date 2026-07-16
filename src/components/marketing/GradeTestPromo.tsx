import { Target, Compass, LineChart } from 'lucide-react';
import { StartTestButton } from './StartTestButton';

/**
 * Sells the entry grading test just above the pricing block. It's the funnel's
 * front door: 28 questions → a saved grade + personal growth points the curator
 * sees. We tease its USP (adaptive, diagnostic, not a quiz) without giving the
 * questions away.
 */

const POINTS = [
  {
    icon: Target,
    title: 'Точный грейд',
    body: '28 вопросов по UI, UX и карьере — не тест «на угадайку», а диагностика уровня.',
  },
  {
    icon: Compass,
    title: 'Персональные точки роста',
    body: 'Сразу видно, какие навыки слабее — платформа усилит именно их.',
  },
  {
    icon: LineChart,
    title: 'Куратор уже видит результат',
    body: 'Грейд сохраняется — на созвоне не начинаете с нуля, а идёте от ваших данных.',
  },
];

export function GradeTestPromo() {
  return (
    <section className="mx-auto mt-24 max-w-[980px]">
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="grid gap-8 p-8 md:grid-cols-[1fr_1.1fr] md:p-10">
          <div>
            <span className="inline-flex rounded-full bg-brand/10 px-2.5 py-1 text-caption font-medium text-brand">
              Бесплатно · 10 минут
            </span>
            <h2 className="mt-3 text-title1 font-bold text-primary">
              Начните с теста на грейд
            </h2>
            <p className="mt-3 text-body text-secondary">
              Прежде чем учиться — узнайте, где вы сейчас. Адаптивный тест определит уровень и построит
              маршрут под ваши слабые места.
            </p>
            <StartTestButton className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-callout font-medium text-on-brand transition-base hover:bg-brand-hover disabled:opacity-60" />
          </div>

          <div className="space-y-3">
            {POINTS.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.title} className="flex gap-3 rounded-xl border border-border bg-canvas p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10">
                    <Icon size={17} className="text-brand" />
                  </div>
                  <div>
                    <p className="text-footnote font-semibold text-primary">{p.title}</p>
                    <p className="mt-0.5 text-caption leading-relaxed text-secondary">{p.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
