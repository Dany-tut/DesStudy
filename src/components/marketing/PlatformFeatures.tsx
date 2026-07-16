import {
  ShieldCheck,
  Sparkles,
  Hammer,
  Layers,
  Ruler,
  Gauge,
  Figma,
  Trophy,
  Briefcase,
} from 'lucide-react';

/**
 * The "why us" grid — the platform's USP spelled out in bounded cards, each a
 * real differentiator from the vision (Validation Engine, coach-not-solver AI,
 * 90% practice, three forms of knowledge, strict design system, adaptivity,
 * Figma, gamification, career). Sits between the interactive showcase and the
 * grading-test funnel.
 */

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Валидация макета за секунды',
    body: '5 движков проверяют сетку, отступы, контраст, иерархию и доступность — сразу, а не «когда-нибудь на ревью».',
  },
  {
    icon: Sparkles,
    title: 'AI-ментор, а не решебник',
    body: 'Объясняет ошибку и ведёт к ответу вопросами. Никогда не выдаёт готовое решение за вас.',
  },
  {
    icon: Hammer,
    title: '90% практики',
    body: 'Учишься, строя интерфейсы руками. Никаких многочасовых пассивных видео.',
  },
  {
    icon: Layers,
    title: 'Знание в трёх формах',
    body: 'Каждое правило: теория → интерактивный тренажёр → реальный проект. Понял, натренировал, применил.',
  },
  {
    icon: Ruler,
    title: 'Строгая дизайн-система',
    body: 'Работаешь по токенам и 8pt-сетке с первого дня — как в настоящем продакшене, а не «на глаз».',
  },
  {
    icon: Gauge,
    title: 'Адаптивная сложность',
    body: 'Платформа видит слабые навыки и подкидывает больше заданий именно на них.',
  },
  {
    icon: Figma,
    title: 'Интеграция с Figma',
    body: 'Импортируй свои файлы и фреймы — проверка идёт по реальной структуре документа.',
  },
  {
    icon: Trophy,
    title: 'Грейд, XP и стрики',
    body: 'Прогресс измерим: заряжаешь кристаллы, копишь XP, растишь грейд и держишь ритм.',
  },
  {
    icon: Briefcase,
    title: 'Портфолио и карьера',
    body: 'Собираешь кейсы, готовишься к тестовым и собесам — до выхода на работу дизайнером.',
  },
];

export function PlatformFeatures() {
  return (
    <section className="mx-auto mt-24 max-w-[980px]">
      <div className="text-center">
        <h2 className="text-title1 font-bold text-primary">Почему это работает</h2>
        <p className="mx-auto mt-2 max-w-[560px] text-body text-secondary">
          Не ещё один видеокурс. Платформа, где ты растёшь через практику с мгновенной обратной связью.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-surface p-5 transition-base hover:border-border-strong"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10">
                <Icon size={19} className="text-brand" />
              </div>
              <h3 className="mt-4 text-callout font-semibold text-primary">{f.title}</h3>
              <p className="mt-1.5 text-footnote leading-relaxed text-secondary">{f.body}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
