'use client';

import { useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { CrystalGem, type GemTone } from '@/components/achievements/CrystalGem';
import { AchievementReveal } from '@/components/achievements/AchievementReveal';

/**
 * Design-system showcase for the gamification crystals — every gem `tone` in
 * both states, the two places they surface in-product (achievements grid +
 * grading-test grade), and a replayable full reveal (stone → cracks → burst).
 * Read-only demo surface: no DB, no progress — just the visual system.
 */

/** Each tone, with where it's used and its rarity treatment. */
const TONES: {
  tone: GemTone;
  label: string;
  rarity: 'обычный' | 'редкий' | 'легендарный';
  use: string;
}[] = [
  { tone: 'sapphire', label: 'Sapphire', rarity: 'обычный', use: 'Junior · первые шаги' },
  { tone: 'ember', label: 'Ember', rarity: 'обычный', use: 'Стрики / дни подряд' },
  { tone: 'amethyst', label: 'Amethyst', rarity: 'обычный', use: 'Middle · очки опыта' },
  { tone: 'emerald', label: 'Emerald', rarity: 'редкий', use: 'Мастерство навыка' },
  { tone: 'gold', label: 'Gold', rarity: 'легендарный', use: 'Senior · вся программа' },
];

/** A few representative badges to show the achievements-grid layout. */
const BADGES: { tone: GemTone; title: string; desc: string; done: boolean }[] = [
  { tone: 'sapphire', title: 'Первые шаги', desc: 'Пройди свой первый урок', done: true },
  { tone: 'ember', title: 'Разогрев', desc: 'Занимайся 3 дня подряд', done: true },
  { tone: 'amethyst', title: '500 XP', desc: 'Набери 500 очков опыта', done: false },
  { tone: 'emerald', title: 'Мастер навыка', desc: 'Точность 90%+ в навыке', done: false },
  { tone: 'gold', title: 'Вся программа', desc: 'Пройди программу целиком', done: false },
];

/** Grade crystals as they appear at the end of the grading test. */
const GRADES: { tone: GemTone; grade: string; tagline: string }[] = [
  { tone: 'sapphire', grade: 'Junior', tagline: 'Крепкий фундамент' },
  { tone: 'amethyst', grade: 'Middle', tagline: 'Уверенный уровень' },
  { tone: 'gold', grade: 'Senior', tagline: 'Сильный профиль' },
];

export function CrystalShowcase() {
  const [reveal, setReveal] = useState<GemTone | null>(null);

  return (
    <div className="flex flex-col gap-14">
      {/* 1 — every variant, unlocked + locked */}
      <div>
        <h3 className="mb-1 text-callout font-semibold text-primary">Все варианты · разблокирован / заблокирован</h3>
        <p className="mb-6 max-w-[620px] text-footnote text-secondary">
          Пять огранок в чистом SVG. Заблокированные тускнеют в «спящую руду» с
          замком и лёгким намёком на родной цвет. Наведи — гранёный кристалл
          наклоняется за курсором, свет проходит по грани.
        </p>
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {TONES.map(({ tone, label, rarity, use }) => (
            <div
              key={tone}
              className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-surface p-5 text-center"
            >
              <div className="flex items-end gap-3">
                <CrystalGem tone={tone} size={72} />
                <CrystalGem tone={tone} locked size={72} />
              </div>
              <div>
                <p className="text-footnote font-semibold text-primary">{label}</p>
                <p className="mt-0.5 text-caption text-tertiary">{use}</p>
                <span className="mt-2 inline-block rounded-full bg-muted px-2 py-0.5 text-caption text-secondary">
                  {rarity}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2 — in the achievements grid */}
      <div>
        <h3 className="mb-1 text-callout font-semibold text-primary">В достижениях · карточка бейджа</h3>
        <p className="mb-6 max-w-[620px] text-footnote text-secondary">
          Как кристалл живёт в сетке «Достижения»: гранёный бейдж слева, название
          и условие справа. Разблокированные подсвечиваются брендовой рамкой.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BADGES.map((b) => (
            <div
              key={b.title}
              className={[
                'flex items-center gap-4 rounded-2xl border p-5 transition-base',
                b.done ? 'border-brand/40 bg-brand/[0.06]' : 'border-border bg-surface',
              ].join(' ')}
            >
              <span className="shrink-0">
                <CrystalGem tone={b.tone} locked={!b.done} size={64} />
              </span>
              <div>
                <p className={['text-callout font-semibold', b.done ? 'text-primary' : 'text-secondary'].join(' ')}>
                  {b.title}
                </p>
                <p className="mt-1 text-footnote text-tertiary">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3 — in the grading test */}
      <div>
        <h3 className="mb-1 text-callout font-semibold text-primary">В тестировании · грейд-кристалл</h3>
        <p className="mb-6 max-w-[620px] text-footnote text-secondary">
          В финале грейд-теста кристалл — это сам грейд: синий Junior, фиолетовый
          Middle, золотой Senior. Его цвет задаёт акцент всей странице результата.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {GRADES.map((g) => (
            <div
              key={g.grade}
              className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface px-5 py-8 text-center"
            >
              <CrystalGem tone={g.tone} size={96} />
              <p className="text-title3 font-bold text-primary">{g.grade}</p>
              <p className="text-footnote text-tertiary">{g.tagline}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 4 — the reveal animation */}
      <div>
        <h3 className="mb-1 text-callout font-semibold text-primary">Анимация появления · камень раскалывается</h3>
        <p className="mb-6 max-w-[620px] text-footnote text-secondary">
          Полный ролик награды: экран темнеет, грубый камень падает и дрожит, по
          нему бегут трещины, затем он раскалывается на осколки — и изнутри
          вырывается кристалл, заливая всё светом. Нажми на тон, чтобы проиграть
          (клик по экрану — закрыть).
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {TONES.map(({ tone, label }) => (
            <button
              key={tone}
              type="button"
              onClick={() => setReveal(tone)}
              className="group flex items-center gap-3 rounded-2xl border border-border bg-surface py-2.5 pl-2.5 pr-4 transition-base hover:border-brand/40 hover:bg-brand/[0.04]"
            >
              <span className="pointer-events-none">
                <CrystalGem tone={tone} size={40} />
              </span>
              <span className="flex items-center gap-1.5 text-footnote font-medium text-primary">
                <Play size={13} className="text-tertiary group-hover:text-brand" />
                {label}
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setReveal(TONES[Math.floor(Math.random() * TONES.length)].tone)}
            className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3 text-footnote font-medium text-secondary transition-base hover:border-brand/40 hover:text-primary"
          >
            <RotateCcw size={14} /> Случайный
          </button>
        </div>
      </div>

      <AchievementReveal
        open={reveal !== null}
        tone={reveal ?? 'sapphire'}
        label="Достижение открыто"
        title="Мастер деталей"
        hint="Нажми в любом месте, чтобы продолжить"
        onDone={() => setReveal(null)}
      />
    </div>
  );
}
