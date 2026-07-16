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
  ArrowUp,
  Star,
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

/**
 * The "screen" every card visualization sits on: a soft brand gradient, an
 * inset hairline ring, and a faint dot-grid texture so it reads as a real
 * surface rather than a flat swatch.
 */
function Stage({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mt-auto h-14 shrink-0 overflow-hidden rounded-xl bg-gradient-to-b from-[rgb(var(--brand-rgb)/0.08)] to-[rgb(var(--brand-rgb)/0.03)] ring-1 ring-inset ring-[rgb(var(--brand-rgb)/0.08)]">
      <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(rgb(var(--brand-rgb)/0.12)_1px,transparent_1px)] [background-size:9px_9px]" />
      {children}
    </div>
  );
}

function CardArt({ art }: { art: Art }) {
  switch (art) {
    // Validation Engine — a mock layout (thumbnail + text rows) with a glowing
    // scan line sweeping through it; each row earns a green success check.
    case 'scan':
      return (
        <Stage>
          <div className="absolute inset-0 flex items-center gap-2.5 px-3">
            <div className="h-7 w-7 shrink-0 rounded-md bg-gradient-to-br from-[rgb(var(--brand-rgb)/0.28)] to-[rgb(var(--brand-rgb)/0.12)] ring-1 ring-inset ring-[rgb(var(--brand-rgb)/0.12)]" />
            <div className="flex flex-1 flex-col gap-1.5">
              {[72, 54, 62].map((w, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span
                    className="h-1.5 rounded-full bg-[rgb(var(--brand-rgb)/0.32)]"
                    style={{ width: `${w}%` }}
                  />
                  <span
                    className="flex h-3 w-3 shrink-0 scale-0 items-center justify-center rounded-full bg-brand opacity-0 shadow-[0_0_6px_rgb(var(--brand-rgb)/0.5)] transition-all duration-300 group-hover:scale-100 group-hover:opacity-100"
                    style={{ transitionDelay: `${360 + i * 170}ms` }}
                  >
                    <Check size={8} strokeWidth={3.5} className="text-white" />
                  </span>
                </div>
              ))}
            </div>
          </div>
          {/* sweeping band with a bright, glowing leading edge */}
          <div className="pf-scan absolute inset-x-0 top-0 h-9">
            <div className="h-full bg-gradient-to-b from-transparent via-[rgb(var(--brand-rgb)/0.18)] to-transparent" />
            <div className="absolute inset-x-1 bottom-0 h-px bg-brand shadow-[0_0_8px_1px_rgb(var(--brand-rgb)/0.7)]" />
          </div>
        </Stage>
      );

    // Coach-not-solver — a question bubble, then the AI "typing" back with a
    // guiding counter-question rather than a finished answer.
    case 'mentor':
      return (
        <Stage>
          <div className="absolute inset-0 flex flex-col justify-center gap-1.5 px-3">
            <span className="max-w-[70%] translate-y-1 self-start rounded-lg rounded-bl-sm bg-[rgb(var(--brand-rgb)/0.14)] px-2 py-1 text-[10px] font-medium text-secondary opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
              где тут ошибка?
            </span>
            <span className="flex items-center gap-1 self-end rounded-lg rounded-br-sm bg-brand px-2.5 py-2 shadow-sm">
              {[0, 1, 2].map((i) => (
                <i
                  key={i}
                  className="pf-typing block h-1 w-1 rounded-full bg-white"
                  style={{ animationDelay: `${i * 180}ms`, opacity: 0.5 }}
                />
              ))}
            </span>
          </div>
        </Stage>
      );

    // 90% practice — a metered bar that charges to 90% with a glossy sweep.
    case 'practice':
      return (
        <Stage>
          <div className="absolute inset-0 flex flex-col justify-center gap-1.5 px-3">
            <div className="relative h-3 overflow-hidden rounded-full bg-[rgb(var(--brand-rgb)/0.14)] ring-1 ring-inset ring-[rgb(var(--brand-rgb)/0.1)]">
              {/* quarter tick marks */}
              <div className="absolute inset-y-0 left-1/4 w-px bg-[rgb(var(--brand-rgb)/0.2)]" />
              <div className="absolute inset-y-0 left-1/2 w-px bg-[rgb(var(--brand-rgb)/0.2)]" />
              <div className="absolute inset-y-0 left-3/4 w-px bg-[rgb(var(--brand-rgb)/0.2)]" />
              <div className="absolute inset-y-0 left-0 w-[15%] rounded-full bg-gradient-to-r from-[rgb(var(--brand-rgb)/0.75)] to-brand transition-[width] duration-700 ease-out group-hover:w-[90%]" />
              <div className="pf-sheen absolute inset-y-0 left-0 w-10 bg-white/50" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-medium uppercase tracking-wide text-secondary">практика</span>
              <span className="text-[11px] font-bold tabular-nums text-brand opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                90%
              </span>
            </div>
          </div>
        </Stage>
      );

    // Three forms — a numbered stepper whose connector fills теория → проект.
    case 'threeforms':
      return (
        <Stage>
          <div className="absolute inset-0 flex items-center justify-between px-5">
            <div className="absolute inset-x-5 top-[42%] h-0.5 -translate-y-1/2 rounded bg-[rgb(var(--brand-rgb)/0.16)]" />
            <div className="absolute left-5 top-[42%] h-0.5 w-0 -translate-y-1/2 rounded bg-brand transition-[width] duration-[900ms] ease-out group-hover:w-[calc(100%-2.5rem)]" />
            {['теория', 'тренажёр', 'проект'].map((label, i) => (
              <div key={label} className="relative z-10 flex flex-col items-center gap-1">
                <span
                  className="flex h-4 w-4 items-center justify-center rounded-full bg-[rgb(var(--brand-rgb)/0.18)] text-[8px] font-bold text-brand ring-2 ring-[rgb(var(--brand-rgb)/0.05)] transition-colors duration-300 group-hover:bg-brand group-hover:text-white"
                  style={{ transitionDelay: `${i * 260}ms` }}
                >
                  {i + 1}
                </span>
                <span
                  className="text-[8px] font-medium text-secondary transition-colors duration-300 group-hover:text-brand"
                  style={{ transitionDelay: `${i * 260}ms` }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </Stage>
      );

    // Strict design system — the 8pt dot grid materializes, then a measure chip.
    case 'grid':
      return (
        <Stage>
          <div className="absolute inset-0 grid grid-cols-8 place-items-center px-4 py-2.5">
            {Array.from({ length: 24 }).map((_, i) => (
              <span
                key={i}
                className="h-1 w-1 scale-0 rounded-full bg-brand opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100"
                style={{ transitionDelay: `${(i % 8) * 45 + Math.floor(i / 8) * 70}ms` }}
              />
            ))}
          </div>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="flex items-center gap-1 rounded-full bg-surface/85 px-2 py-0.5 text-[9px] font-bold text-brand opacity-0 shadow-sm backdrop-blur-sm transition-opacity duration-500 [transition-delay:550ms] group-hover:opacity-100">
              <span className="h-2.5 w-px bg-brand" />
              8pt
              <span className="h-2.5 w-px bg-brand" />
            </span>
          </div>
        </Stage>
      );

    // Adaptive difficulty — an equalizer re-balances; the weak skill spikes up.
    case 'adaptive':
      return (
        <Stage>
          <div className="absolute inset-x-0 bottom-2.5 flex items-end justify-center gap-1.5">
            {[0.5, 1, 0.4, 0.85, 0.55].map((h, i) => (
              <span
                key={i}
                className="pf-eq w-2 rounded-full bg-gradient-to-t from-brand to-[rgb(var(--brand-rgb)/0.45)]"
                style={{ height: `${h * 26 + 6}px`, animationDelay: `${i * 130}ms` }}
              />
            ))}
          </div>
          <div className="absolute inset-x-3 bottom-2 h-px bg-[rgb(var(--brand-rgb)/0.2)]" />
          <ArrowUp
            size={11}
            strokeWidth={2.5}
            className="absolute left-1/2 top-2 -translate-x-1/2 text-brand opacity-0 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:opacity-100 [transition-delay:400ms]"
          />
        </Stage>
      );

    // Figma import — offset layer frames (with header bars) snap into a stack,
    // and selection handles pop on the aligned frame.
    case 'figma':
      return (
        <Stage>
          <div className="absolute inset-0 flex items-center justify-center">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="pf-frame absolute h-8 w-11 overflow-hidden rounded-md border border-brand/50 bg-[rgb(var(--brand-rgb)/0.07)] shadow-sm transition-transform duration-500 ease-out"
                style={{
                  ['--tx' as string]: `${(i - 1) * 16}px`,
                  ['--ty' as string]: `${(i - 1) * 7}px`,
                  transitionDelay: `${i * 80}ms`,
                }}
              >
                <span className="block h-1.5 w-full bg-brand/35" />
              </span>
            ))}
            {/* selection handles once frames align */}
            <span className="pointer-events-none absolute h-8 w-11 opacity-0 transition-opacity duration-300 [transition-delay:520ms] group-hover:opacity-100">
              {[
                '-left-1 -top-1',
                '-right-1 -top-1',
                '-bottom-1 -left-1',
                '-bottom-1 -right-1',
              ].map((pos) => (
                <span
                  key={pos}
                  className={`absolute h-1.5 w-1.5 rounded-[2px] border border-brand bg-surface ${pos}`}
                />
              ))}
            </span>
          </div>
        </Stage>
      );

    // Grade / XP / streaks — a level badge, a segmented XP bar that charges,
    // and a flickering streak flame.
    case 'xp':
      return (
        <Stage>
          <div className="absolute inset-0 flex items-center gap-2 px-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-brand to-[rgb(var(--brand-rgb)/0.7)] text-[9px] font-bold text-white shadow-sm">
              4
            </span>
            <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-[rgb(var(--brand-rgb)/0.14)] ring-1 ring-inset ring-[rgb(var(--brand-rgb)/0.1)]">
              <div className="absolute inset-y-0 left-0 w-[20%] rounded-full bg-gradient-to-r from-brand to-[rgb(var(--brand-rgb)/0.6)] transition-[width] duration-700 ease-out group-hover:w-[78%]" />
              <div className="absolute inset-0 flex justify-evenly">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className="w-px bg-surface/70" />
                ))}
              </div>
            </div>
            <svg viewBox="0 0 12 16" className="pf-flame h-4 w-3" style={{ opacity: 0.7 }}>
              <defs>
                <linearGradient id="pf-flame-g" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0" stopColor="rgb(var(--brand-rgb))" />
                  <stop offset="1" stopColor="rgb(var(--brand-rgb) / 0.5)" />
                </linearGradient>
              </defs>
              <path
                fill="url(#pf-flame-g)"
                d="M6 0c1 3-2 4-2 7a3 3 0 0 0 6 0c0-1-.4-2-1-2.6.2 1.2-.6 1.8-1 1.8.6-2-.4-5-2-6.2Z"
              />
            </svg>
          </div>
        </Stage>
      );

    // Portfolio & career — detailed case cards fan out into a ready deck, the
    // front one earning a star badge.
    case 'portfolio':
      return (
        <Stage>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="absolute h-10 w-8 rounded-md border border-brand/40 bg-[rgb(var(--brand-rgb)/0.06)] shadow-sm transition-transform duration-500 group-hover:-translate-x-5 group-hover:-rotate-[16deg]" />
            <span className="absolute h-10 w-8 rounded-md border border-brand/40 bg-[rgb(var(--brand-rgb)/0.06)] shadow-sm transition-transform duration-500 group-hover:translate-x-5 group-hover:rotate-[16deg]" />
            {/* front card with mini content */}
            <span className="absolute h-10 w-8 rounded-md border border-brand/60 bg-surface shadow-md transition-transform duration-500 group-hover:-translate-y-1">
              <span className="absolute inset-x-1 top-1 h-2.5 rounded-sm bg-gradient-to-br from-[rgb(var(--brand-rgb)/0.3)] to-[rgb(var(--brand-rgb)/0.12)]" />
              <span className="absolute left-1 top-[18px] h-0.5 w-5 rounded bg-[rgb(var(--brand-rgb)/0.3)]" />
              <span className="absolute left-1 top-[22px] h-0.5 w-3.5 rounded bg-[rgb(var(--brand-rgb)/0.2)]" />
              <Star
                size={9}
                className="pf-twinkle absolute -right-1 -top-1 fill-brand text-brand"
              />
            </span>
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
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface p-5 transition-all duration-300 hover:-translate-y-1 hover:border-border-strong hover:shadow-[0_12px_32px_-12px_rgb(var(--brand-rgb)/0.25)]"
            >
              {/* ambient brand glow that fades in from the corner on hover */}
              <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[rgb(var(--brand-rgb)/0.12)] opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />

              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                <Icon size={19} className="text-brand" />
              </div>
              <h3 className="relative mt-4 text-callout font-semibold text-primary">{f.title}</h3>
              <p className="relative mt-1.5 mb-8 text-footnote leading-relaxed text-secondary">{f.body}</p>

              <CardArt art={f.art} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
