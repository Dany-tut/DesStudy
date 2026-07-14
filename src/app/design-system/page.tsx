'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon, Check, Sparkles, ArrowRight, Lock } from 'lucide-react';
import { space, radius, semanticColors } from '@/design/tokens';
import { loadSettings, applySettings, saveSettings } from '@/lib/settings';
import { Button } from '@/components/ui/Button';
import { Stepper } from '@/components/ui/Stepper';
import { Slider } from '@/components/ui/Slider';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Switch } from '@/components/ui/Switch';
import { ChoiceCard } from '@/components/ui/ChoiceCard';
import { TilePicker } from '@/components/ui/TilePicker';
import { SwatchPicker } from '@/components/ui/SwatchPicker';
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { AutoLayoutCanvas } from '@/components/exercises/AutoLayoutCanvas';
import { OrderCanvas } from '@/components/exercises/OrderCanvas';
import { RadiusDragTune } from '@/components/exercises/RadiusDragTune';
import { FigmaLinkSubmit } from '@/components/exercises/FigmaLinkSubmit';
import { FileUploadZone } from '@/components/exercises/FileUploadZone';
import { VideoEmbed } from '@/components/lesson/VideoEmbed';
import { BarBuilder } from '@/components/exercises/drafts/BarBuilder';
import { ContrastTuner } from '@/components/exercises/drafts/ContrastTuner';
import { AlignSnap } from '@/components/exercises/drafts/AlignSnap';
import { MatchPairs } from '@/components/exercises/drafts/MatchPairs';
import { ScaleRamp } from '@/components/exercises/drafts/ScaleRamp';
import { Hotspot } from '@/components/exercises/drafts/Hotspot';
import { TrimZone } from '@/components/exercises/TrimZone';
import { NestedRadius } from '@/components/exercises/NestedRadius';
import { StatesLab } from '@/components/exercises/drafts/StatesLab';
import { FixTheScreen } from '@/components/exercises/drafts/FixTheScreen';
import type { BuildAnswer, BuildExercise, OrderExercise } from '@/lib/curriculum/types';

/** Sample exercises used only to render the interactive surfaces in the showcase. */
const DEMO_BUILD: BuildExercise = {
  id: 'ds-build',
  type: 'build',
  prompt: '',
  blocks: 3,
  step: 4,
  min: 0,
  max: 48,
  target: { gap: 16, padding: 24 },
  explanation: '',
};

const DEMO_ORDER: OrderExercise = {
  id: 'ds-order',
  type: 'order',
  prompt: '',
  items: [
    { id: 'title', label: 'Заголовок экрана', size: 'title' },
    { id: 'body', label: 'Основной текст описания', size: 'body' },
    { id: 'caption', label: 'Подпись · метка', size: 'caption' },
    { id: 'cta', label: 'Действие', size: 'button' },
  ],
  correctOrder: ['title', 'body', 'caption', 'cta'],
  explanation: '',
};

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
  const [trim, setTrim] = useState(0);
  const [innerRadius, setInnerRadius] = useState(0);
  const [align, setAlign] = useState<'left' | 'center' | 'right'>('center');
  const [sample, setSample] = useState<'a' | 'b' | 'c' | 'd'>('c');
  const [build, setBuild] = useState<BuildAnswer>({ gap: 16, padding: 16 });
  const [order, setOrder] = useState<string[]>(['body', 'title', 'cta', 'caption']);
  const [rad, setRad] = useState(14);
  const [figma, setFigma] = useState('');
  const [upload, setUpload] = useState<string | null>(null);

  // Sync the button with the theme already applied to <html> (persisted in
  // localStorage and set pre-paint by APPLY_SNIPPET), so no "dead" first click.
  useEffect(() => {
    setDark(document.documentElement.dataset.theme === 'dark');
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    const settings = loadSettings();
    settings.theme = next ? 'dark' : 'light';
    applySettings(settings);
    saveSettings(settings);
  };

  return (
    <main className="mx-auto max-w-[1200px] px-8 py-12">
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

      <Section title="Отступы между блоками — вертикальный ритм">
        <p className="mb-5 max-w-[560px] text-body text-secondary">
          Расстояние между блоками задаётся теми же токенами. Чем крупнее
          смысловая граница, тем больше отступ: внутри группы — тесно, между
          секциями — просторно.
        </p>
        <div className="flex flex-col gap-6 sm:flex-row">
          {([
            { token: '3', label: 'Внутри группы', hint: 'подпись под полем' },
            { token: '4', label: 'Между полями', hint: 'соседние элементы' },
            { token: '8', label: 'Между группами', hint: 'логические блоки' },
            { token: '14', label: 'Между секциями', hint: 'крупные разделы' },
          ] as const).map(({ token, label, hint }) => (
            <div key={token} className="flex-1 rounded-lg border border-border p-4">
              <div className="mb-3 flex items-baseline justify-between">
                <span className="text-footnote font-medium text-primary">{label}</span>
                <span className="text-caption text-tertiary">
                  space.{token} · {space[token as unknown as keyof typeof space]}
                </span>
              </div>
              <div className="flex flex-col" style={{ gap: space[token as unknown as keyof typeof space] }}>
                <div className="h-6 rounded-sm bg-muted" />
                <div className="h-6 rounded-sm bg-muted" />
              </div>
              <p className="mt-3 text-caption text-tertiary">{hint}</p>
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

      <div className="mb-8 mt-20 border-t border-border pt-10">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-footnote text-brand">
          <Sparkles size={14} />
          Новые типы интерактива · черновики
        </div>
        <p className="max-w-[600px] text-body text-secondary">
          Кандидаты новых механик для уроков. Все живые — потрогай и выбери, что
          пойдём доводить до продакшена. Дизайн черновой, важна суть механики.
        </p>
      </div>

      <Section title="Bar-builder — собери нав/топ-бар как конструктор («bar-builder»)">
        <BarBuilder />
      </Section>

      <Section title="Contrast — доведи цвет до WCAG («contrast»)">
        <ContrastTuner />
      </Section>

      <Section title="Align — тащи к гайдам со снапом («align»)">
        <AlignSnap />
      </Section>

      <Section title="Match — соедини токен со значением («match»)">
        <MatchPairs />
      </Section>

      <Section title="Scale-ramp — собери типографическую шкалу («scale-ramp»)">
        <ScaleRamp />
      </Section>

      <Section title="Hotspot — найди проблему на макете («hotspot»)">
        <Hotspot />
      </Section>

      <Section title="States — состояния компонента («states»)">
        <StatesLab />
      </Section>

      <Section title="Trim-zone — подрежь поле шрифта («trim-zone»)">
        <TrimZone label="Submit" targetTrim={9} maxTrim={18} value={trim} onChange={setTrim} />
      </Section>

      <Section title="Nested-radius — концентричные скругления («nested-radius»)">
        <NestedRadius outerRadius={24} padding={8} maxRadius={24} value={innerRadius} onChange={setInnerRadius} />
      </Section>

      <Section title="Fix-the-screen — почини сломанный макет («fix-screen»)">
        <FixTheScreen />
      </Section>

      <div className="mb-8 mt-20 border-t border-border pt-10">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-footnote text-brand">
          <Sparkles size={14} />
          Интерактивы упражнений
        </div>
        <p className="max-w-[560px] text-body text-secondary">
          Полноценные интерактивные поверхности, которые встречает ученик в
          уроках. Все живые — можно потрогать прямо здесь.
        </p>
      </div>

      <Section title="Build — холст auto-layout (тип «build»)">
        <AutoLayoutCanvas
          exercise={DEMO_BUILD}
          value={build}
          disabled={false}
          onChange={(update) => setBuild(update)}
        />
      </Section>

      <Section title="Order — перетаскивание по порядку (тип «order»)">
        <OrderCanvas exercise={DEMO_ORDER} value={order} disabled={false} onChange={setOrder} />
      </Section>

      <Section title="Tune · radius — тяни за угол (тип «tune», visual «radius»)">
        <div className="max-w-[420px]">
          <RadiusDragTune value={rad} min={0} max={60} onChange={setRad} />
        </div>
      </Section>

      <Section title="Figma-link — сдача ссылки (тип «figma-link»)">
        <FigmaLinkSubmit value={figma} disabled={false} onChange={setFigma} />
      </Section>

      <Section title="File-upload — загрузка файла (тип «file-upload»)">
        <FileUploadZone
          lessonSlug="design-system"
          exerciseId="ds-upload"
          accept="image/png,image/jpeg,application/pdf"
          maxSizeMB={8}
          value={upload}
          disabled={false}
          onChange={setUpload}
        />
      </Section>

      <Section title="Video — видео урока (YouTube / Vimeo / файл)">
        <div className="max-w-[560px]">
          <VideoEmbed
            video={{
              url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              caption: 'Пример встроенного видео урока',
              provider: 'youtube',
            }}
          />
        </div>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-24">
      <h2 className="mb-6 text-title3 font-semibold text-primary">{title}</h2>
      {children}
    </section>
  );
}
