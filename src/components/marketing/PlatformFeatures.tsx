import { Fragment } from 'react';
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
  Check,
  ArrowRight,
} from 'lucide-react';

/**
 * The "why us" grid — the platform's USP spelled out in bounded cards, each a
 * real differentiator from the vision (Validation Engine, coach-not-solver AI,
 * 90% practice, three forms of knowledge, strict design system, adaptivity,
 * Figma, gamification, career). Sits between the interactive showcase and the
 * grading-test funnel.
 *
 * Each card carries a bespoke micro-visualization in its footer that literally
 * illustrates the mechanism and comes alive on hover — a validation scan line,
 * a filling XP bar, an adapting equalizer, and so on. Everything is CSS
 * group-hover (no JS, no client boundary); looping motions live in globals.css
 * under `.pf-*`, one-shot reveals are Tailwind transitions here. Resting state
 * is calm; the reduced-motion rule in globals.css collapses it all.
 */

type Art =
  | 'scan'
  | 'mentor'
  | 'practice'
  | 'threeforms'
  | 'grid'
  | 'adaptive'
  | 'figma'
  | 'xp'
  | 'portfolio';

const FEATURES: {
  icon: typeof ShieldCheck;
  title: string;
  body: string;
  art: Art;
}[] = [
  {
    icon: ShieldCheck,
    title: 'Валидация макета за секунды',
    body: '5 движков проверяют сетку, отступы, контраст, иерархию и доступность — сразу, а не «когда-нибудь на ревью».',
    art: 'scan',
  },
  {
    icon: Sparkles,
    title: 'AI-ментор, а не решебник',
    body: 'Объясняет ошибку и ведёт к ответу вопросами. Никогда не выдаёт готовое решение за вас.',
    art: 'mentor',
  },
  {
    icon: Hammer,
    title: '90% практики',
    body: 'Учишься, строя интерфейсы руками. Никаких многочасовых пассивных видео.',
    art: 'practice',
  },
  {
    icon: Layers,
    title: 'Знание в трёх формах',
    body: 'Каждое правило: теория → интерактивный тренажёр → реальный проект. Понял, натренировал, применил.',
    art: 'threeforms',
  },
  {
    icon: Ruler,
    title: 'Строгая дизайн-система',
    body: 'Работаешь по токенам и 8pt-сетке с первого дня — как в настоящем продакшене, а не «на глаз».',
    art: 'grid',
  },
  {
    icon: Gauge,
    title: 'Адаптивная сложность',
    body: 'Платформа видит слабые навыки и подкидывает больше заданий именно на них.',
    art: 'adaptive',
  },
  {
    icon: Figma,
    title: 'Интеграция с Figma',
    body: 'Импортируй свои файлы и фреймы — проверка идёт по реальной структуре документа.',
    art: 'figma',
  },
  {
    icon: Trophy,
    title: 'Грейд, XP и стрики',
    body: 'Прогресс измерим: заряжаешь кристаллы, копишь XP, растишь грейд и держишь ритм.',
    art: 'xp',
  },
  {
    icon: Briefcase,
    title: 'Портфолио и карьера',
    body: 'Собираешь кейсы, готовишься к тестовым и собесам — до выхода на работу дизайнером.',
    art: 'portfolio',
  },
];

/** Small brand-tinted stage that hosts every card's micro-visualization. */
function Stage({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mt-4 h-14 overflow-hidden rounded-xl bg-[rgb(var(--brand-rgb)/0.05)]">
      {children}
    </div>
  );
}

function CardArt({ art }: { art: Art }) {
  switch (art) {
    // Validation Engine — a wireframe with a scan line sweeping through it,
    // each row flipping to a green-tinted "passed" check as it clears.
    case 'scan':
      return (
        <Stage>
          <div className="absolute inset-0 flex flex-col justify-center gap-1.5 px-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <span
                  className="h-1.5 rounded-full bg-[rgb(var(--brand-rgb)/0.35)] transition-all duration-500"
                  style={{ width: `${[64, 44, 52][i]}%`, transitionDelay: `${i * 120}ms` }}
                />
                <Check
                  size={11}
                  className="text-brand opacity-0 transition-all duration-300 group-hover:opacity-100"
                  style={{ transitionDelay: `${300 + i * 160}ms` }}
                />
              </div>
            ))}
          </div>
          <div className="pf-scan absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-transparent via-[rgb(var(--brand-rgb)/0.28)] to-transparent" />
        </Stage>
      );

    // Coach-not-solver — questions bubble up, never a finished answer.
    case 'mentor':
      return (
        <Stage>
          <div className="absolute inset-0 flex items-center gap-2 px-3">
            <span className="rounded-lg rounded-bl-sm bg-[rgb(var(--brand-rgb)/0.18)] px-2 py-1 text-[11px] font-semibold text-brand opacity-0 transition-all duration-300 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0">
              а что здесь важнее?
            </span>
            <span
              className="pf-pulse flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white"
              style={{ opacity: 0.55 }}
            >
              ?
            </span>
          </div>
        </Stage>
      );

    // 90% practice — a bar that fills to exactly 90% with a running highlight.
    case 'practice':
      return (
        <Stage>
          <div className="absolute inset-0 flex flex-col justify-center px-3">
            <div className="relative h-2.5 overflow-hidden rounded-full bg-[rgb(var(--brand-rgb)/0.15)]">
              <div className="absolute inset-y-0 left-0 w-[15%] rounded-full bg-brand transition-[width] duration-700 ease-out group-hover:w-[90%]" />
              <div className="pf-sheen absolute inset-y-0 left-0 w-8 bg-white/40" />
            </div>
            <span className="mt-1.5 self-end text-[11px] font-bold text-brand opacity-0 transition-opacity duration-500 group-hover:opacity-100">
              90% руками
            </span>
          </div>
        </Stage>
      );

    // Three forms — теория → тренажёр → проект light up left to right.
    case 'threeforms':
      return (
        <Stage>
          <div className="absolute inset-0 flex items-center justify-center gap-1.5 px-3">
            {['теория', 'тренажёр', 'проект'].map((label, i) => (
              <Fragment key={label}>
                <span
                  className="rounded-md bg-[rgb(var(--brand-rgb)/0.12)] px-2 py-1 text-[10px] font-semibold text-secondary transition-all duration-300 group-hover:bg-brand group-hover:text-white"
                  style={{ transitionDelay: `${i * 180}ms` }}
                >
                  {label}
                </span>
                {i < 2 && (
                  <ArrowRight
                    size={11}
                    className="shrink-0 text-brand opacity-30 transition-opacity duration-300 group-hover:opacity-100"
                    style={{ transitionDelay: `${90 + i * 180}ms` }}
                  />
                )}
              </Fragment>
            ))}
          </div>
        </Stage>
      );

    // Strict design system — the 8pt dot grid materializes.
    case 'grid':
      return (
        <Stage>
          <div className="absolute inset-0 grid grid-cols-8 place-items-center px-3 py-2">
            {Array.from({ length: 24 }).map((_, i) => (
              <span
                key={i}
                className="h-1 w-1 rounded-full bg-brand opacity-0 transition-all duration-300 group-hover:opacity-100 scale-0 group-hover:scale-100"
                style={{ transitionDelay: `${(i % 8) * 40 + Math.floor(i / 8) * 60}ms` }}
              />
            ))}
          </div>
        </Stage>
      );

    // Adaptive difficulty — bars re-balance, weak skills get taller.
    case 'adaptive':
      return (
        <Stage>
          <div className="absolute inset-0 flex items-end justify-center gap-1.5 px-3 pb-2.5">
            {[0.5, 1, 0.4, 0.8, 0.55].map((h, i) => (
              <span
                key={i}
                className="pf-eq w-2 rounded-t-sm bg-brand"
                style={{ height: `${h * 26 + 6}px`, animationDelay: `${i * 130}ms` }}
              />
            ))}
          </div>
        </Stage>
      );

    // Figma import — offset layer frames slide into perfect alignment.
    case 'figma':
      return (
        <Stage>
          <div className="absolute inset-0 flex items-center justify-center [perspective:400px]">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="pf-frame absolute h-8 w-11 rounded-md border border-brand/50 bg-[rgb(var(--brand-rgb)/0.08)] transition-transform duration-500 ease-out"
                style={{
                  // fanned/offset at rest, snaps to aligned stack on hover
                  ['--tx' as string]: `${(i - 1) * 16}px`,
                  ['--ty' as string]: `${(i - 1) * 7}px`,
                  transitionDelay: `${i * 80}ms`,
                }}
              />
            ))}
          </div>
        </Stage>
      );

    // Grade / XP / streaks — the XP bar charges and a streak flame flickers.
    case 'xp':
      return (
        <Stage>
          <div className="absolute inset-0 flex items-center gap-2 px-3">
            <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-[rgb(var(--brand-rgb)/0.15)]">
              <div className="absolute inset-y-0 left-0 w-[20%] rounded-full bg-gradient-to-r from-brand to-[rgb(var(--brand-rgb)/0.7)] transition-[width] duration-700 ease-out group-hover:w-[78%]" />
            </div>
            <span className="text-[11px] font-bold text-brand tabular-nums opacity-60 transition-opacity duration-500 group-hover:opacity-100">
              Lv.4
            </span>
            <svg viewBox="0 0 12 16" className="pf-flame h-4 w-3 text-brand" style={{ opacity: 0.6 }}>
              <path
                fill="currentColor"
                d="M6 0c1 3-2 4-2 7a3 3 0 0 0 6 0c0-1-.4-2-1-2.6.2 1.2-.6 1.8-1 1.8.6-2-.4-5-2-6.2Z"
              />
            </svg>
          </div>
        </Stage>
      );

    // Portfolio & career — case cards fan out into a ready deck.
    case 'portfolio':
      return (
        <Stage>
          <div className="absolute inset-0 flex items-center justify-center">
            {/* stacked at rest, fan out into a deck on hover */}
            <span className="absolute h-9 w-7 rounded-md border border-brand/40 bg-[rgb(var(--brand-rgb)/0.06)] transition-transform duration-500 group-hover:-translate-x-5 group-hover:-rotate-[16deg]" />
            <span className="absolute h-9 w-7 rounded-md border border-brand/40 bg-[rgb(var(--brand-rgb)/0.06)] transition-transform duration-500 group-hover:translate-x-5 group-hover:rotate-[16deg]" />
            <span className="absolute h-9 w-7 rounded-md border border-brand/60 bg-[rgb(var(--brand-rgb)/0.12)] shadow-sm transition-transform duration-500 group-hover:-translate-y-0.5" />
          </div>
        </Stage>
      );
  }
}

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
              className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-5 transition-all duration-300 hover:-translate-y-1 hover:border-border-strong hover:shadow-[0_12px_32px_-12px_rgb(var(--brand-rgb)/0.25)]"
            >
              {/* ambient brand glow that fades in from the corner on hover */}
              <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[rgb(var(--brand-rgb)/0.12)] opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />

              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                <Icon size={19} className="text-brand" />
              </div>
              <h3 className="relative mt-4 text-callout font-semibold text-primary">{f.title}</h3>
              <p className="relative mt-1.5 text-footnote leading-relaxed text-secondary">{f.body}</p>

              <CardArt art={f.art} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
