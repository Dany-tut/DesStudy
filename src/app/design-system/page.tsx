'use client';

import { useState } from 'react';
import { Sun, Moon, Check, Sparkles, ArrowRight, Lock } from 'lucide-react';
import { space, radius, semanticColors } from '@/design/tokens';
import { Button } from '@/components/ui/Button';
import { Stepper } from '@/components/ui/Stepper';
import { Slider } from '@/components/ui/Slider';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Switch } from '@/components/ui/Switch';
import { ChoiceCard } from '@/components/ui/ChoiceCard';
import { TilePicker } from '@/components/ui/TilePicker';
import { SwatchPicker } from '@/components/ui/SwatchPicker';
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

/**
 * Design System showcase — Chapter 3 (UX/UI Bible) made visible.
 * Everything here is rendered from tokens only. No magic numbers.
 */
export default function DesignSystemPage() {
  const [dark, setDark] = useState(false);
  const [gap, setGap] = useState(16);
  const [tune, setTune] = useState(24);
  const [density, setDensity] = useState<'compact' | 'cozy' | 'roomy'>('cozy');
  const [notifications, setNotifications] = useState(true);
  const [choice, setChoice] = useState<string | null>('flex');
  const [padding, setPadding] = useState(16);
  const [align, setAlign] = useState<'left' | 'center' | 'right'>('center');
  const [sample, setSample] = useState<'a' | 'b' | 'c' | 'd'>('c');

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
  };

  return (
    <main className="mx-auto max-w-[960px] px-6 py-12">
      <header className="mb-16 flex items-start justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-footnote text-secondary">
            <Sparkles size={14} className="text-brand" />
            PROJECT_BIBLE · Chapter 3
          </div>
          <h1 className="text-display font-bold text-primary">Дизайн-система</h1>
          <p className="mt-3 max-w-[520px] text-callout text-secondary">
            Конституция дизайна. Каждый размер, отступ, радиус, цвет и переход
            берётся из токенов. Magic numbers невозможны.
          </p>
        </div>
        <button
          onClick={toggle}
          className="glass flex h-11 w-11 items-center justify-center rounded-full text-primary transition-base hover:scale-105"
          aria-label="Toggle theme"
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      <Section title="Typography — SF Pro modular scale">
        <div className="space-y-3">
          <p className="text-display font-bold text-primary">Display 44</p>
          <p className="text-title1 font-semibold text-primary">Title 1 · 32</p>
          <p className="text-title2 font-semibold text-primary">Title 2 · 24</p>
          <p className="text-title3 font-medium text-primary">Title 3 · 20</p>
          <p className="text-callout text-primary">Callout · 16 — основной интерфейсный текст.</p>
          <p className="text-body text-secondary">Body · 15 — параграфы и описания.</p>
          <p className="text-footnote text-tertiary">Footnote · 13 — вспомогательный.</p>
          <p className="text-caption text-tertiary">Caption · 12 — метки и подписи.</p>
        </div>
      </Section>

      <Section title="Semantic colors">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Object.keys(semanticColors.light).map((name) => (
            <div key={name} className="rounded-lg border border-border p-3">
              <div
                className="mb-2 h-12 w-full rounded-md border border-border"
                style={{ background: `var(--${name})` }}
              />
              <p className="text-caption text-secondary">{name}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Spacing — 8pt grid">
        <div className="flex flex-wrap items-end gap-4">
          {Object.entries(space)
            .filter(([k]) => !['0', '0.5'].includes(k))
            .map(([k, v]) => (
              <div key={k} className="flex flex-col items-center gap-2">
                <div className="rounded-sm bg-brand" style={{ width: v, height: v }} />
                <span className="text-caption text-tertiary">{k}</span>
              </div>
            ))}
        </div>
      </Section>

      <Section title="Radius">
        <div className="flex flex-wrap gap-4">
          {Object.entries(radius).map(([k, v]) => (
            <div key={k} className="flex flex-col items-center gap-2">
              <div
                className="h-16 w-16 border border-border-strong bg-muted"
                style={{ borderRadius: v }}
              />
              <span className="text-caption text-tertiary">{k}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Elevation">
        <div className="flex flex-wrap gap-6">
          {(['sm', 'md', 'lg', 'xl'] as const).map((s) => (
            <div
              key={s}
              className={`flex h-20 w-32 items-center justify-center rounded-lg bg-surface text-footnote text-secondary shadow-${s}`}
            >
              shadow-{s}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Кнопки">
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="primary" size="lg">
            Начать урок <ArrowRight size={16} />
          </Button>
          <Button variant="secondary" size="lg">
            Вторичная
          </Button>
          <Button variant="success" size="lg">
            <Check size={16} /> Пройдено
          </Button>
          <Button variant="danger" size="lg">
            Сбросить
          </Button>
          <Button variant="ghost" size="lg">
            Пропустить
          </Button>
          <Button variant="primary" size="lg" disabled>
            <Lock size={16} /> Заблокировано
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="primary" size="sm">
            sm
          </Button>
          <Button variant="primary" size="md">
            md
          </Button>
          <Button variant="primary" size="lg">
            lg
          </Button>
        </div>
      </Section>

      <Section title="Степпер — точная настройка на 8pt-сетке">
        <div className="flex flex-wrap items-start gap-10">
          <div className="max-w-[280px]">
            <Stepper label="Отступ между блоками" value={gap} min={0} max={64} step={4} onChange={setGap} />
          </div>
          <Stepper label="Внутренние поля" value={padding} min={0} max={48} step={4} variant="dots" onChange={setPadding} />
        </div>
      </Section>

      <Section title="Ползунок — плавная настройка в диапазоне">
        <div className="max-w-[420px]">
          <Slider value={tune} min={0} max={64} step={2} unit="px" onChange={setTune} />
        </div>
      </Section>

      <Section title="Сегментированный переключатель">
        <SegmentedControl
          value={density}
          onChange={setDensity}
          options={[
            { value: 'compact', label: 'Компактно' },
            { value: 'cozy', label: 'Уютно' },
            { value: 'roomy', label: 'Просторно' },
          ]}
        />
      </Section>

      <Section title="Свитч">
        <Switch checked={notifications} onChange={setNotifications} label="Уведомления о прогрессе" />
      </Section>

      <Section title="Карточки выбора">
        <div className="grid gap-3 sm:grid-cols-2">
          <ChoiceCard label="flex-direction: column" selected={choice === 'flex'} onClick={() => setChoice('flex')} />
          <ChoiceCard label="display: grid" selected={choice === 'grid'} onClick={() => setChoice('grid')} />
          <ChoiceCard
            label="position: absolute"
            selected={choice === 'absolute'}
            correct
            onClick={() => setChoice('absolute')}
          />
          <ChoiceCard label="float: left" selected={false} disabled onClick={() => setChoice('float')} />
        </div>
      </Section>

      <Section title="Пикеры — иконки-плитки и сэмплы">
        <div className="flex flex-col gap-8">
          <div>
            <p className="mb-3 text-footnote text-secondary">Выравнивание блока</p>
            <TilePicker
              value={align}
              onChange={setAlign}
              options={[
                { value: 'left', label: 'Слева', icon: AlignLeft },
                { value: 'center', label: 'Центр', icon: AlignCenter },
                { value: 'right', label: 'Справа', icon: AlignRight },
              ]}
            />
          </div>
          <div>
            <p className="mb-3 text-footnote text-secondary">Какой пример верный?</p>
            <SwatchPicker
              value={sample}
              onChange={setSample}
              options={[
                { value: 'a', label: 'A' },
                { value: 'b', label: 'B' },
                { value: 'c', label: 'C', swatch: 'var(--brand)' },
                { value: 'd', label: 'D' },
              ]}
            />
          </div>
        </div>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-14">
      <h2 className="mb-5 text-title3 font-semibold text-primary">{title}</h2>
      {children}
    </section>
  );
}
