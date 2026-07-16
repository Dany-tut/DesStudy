'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon, Check, Sparkles, ArrowRight, Lock } from 'lucide-react';
import { space, radius, semanticColors } from '@/design/tokens';
import { useT } from '@/lib/i18n/client';
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
import { CritiqueEditorVariants } from '@/components/admin/critique/CritiqueEditorVariants';
import { StatesLab } from '@/components/exercises/drafts/StatesLab';
import { SpotDiff } from '@/components/exercises/drafts/SpotDiff';
import { TapTarget } from '@/components/exercises/drafts/TapTarget';
import { EasingCurve } from '@/components/exercises/drafts/EasingCurve';
import { FocusOrder } from '@/components/exercises/drafts/FocusOrder';
import { ButtonHierarchy } from '@/components/exercises/drafts/ButtonHierarchy';
import { BreakpointTuner } from '@/components/exercises/drafts/BreakpointTuner';
import { BreakpointTriggers } from '@/components/exercises/drafts/BreakpointTriggers';
import { GridColumns } from '@/components/exercises/drafts/GridColumns';
import { FixTheScreen } from '@/components/exercises/FixTheScreen';
import { ScreenWalkthrough } from '@/components/exercises/ScreenWalkthrough';
import { ScreenCritique } from '@/components/exercises/ScreenCritique';
import { CrystalShowcase } from '@/components/achievements/CrystalShowcase';
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
  const { t } = useT();
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
          <h1 className="text-display font-bold text-primary">{t('designSystem.pageTitle')}</h1>
          <p className="mt-3 max-w-[520px] text-callout text-secondary">
            {t('designSystem.pageSubtitle')}
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
          <p className="text-callout text-primary">{t('designSystem.typeCallout')}</p>
          <p className="text-body text-secondary">{t('designSystem.typeBody')}</p>
          <p className="text-footnote text-tertiary">{t('designSystem.typeFootnote')}</p>
          <p className="text-caption text-tertiary">{t('designSystem.typeCaption')}</p>
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

      <Section title={t('designSystem.spacingTitle')}>
        <p className="mb-5 max-w-[560px] text-body text-secondary">
          {t('designSystem.spacingDesc')}
        </p>
        <div className="flex flex-col gap-6 sm:flex-row">
          {([
            { token: '3', label: t('designSystem.spacingWithinGroup'), hint: t('designSystem.spacingHintCaption') },
            { token: '4', label: t('designSystem.spacingBetweenFields'), hint: t('designSystem.spacingHintNeighbors') },
            { token: '8', label: t('designSystem.spacingBetweenGroups'), hint: t('designSystem.spacingHintLogical') },
            { token: '14', label: t('designSystem.spacingBetweenSections'), hint: t('designSystem.spacingHintLarge') },
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

      <Section title={t('designSystem.buttonsTitle')}>
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="primary" size="lg">
            {t('designSystem.btnStartLesson')} <ArrowRight size={16} />
          </Button>
          <Button variant="secondary" size="lg">
            {t('designSystem.btnSecondary')}
          </Button>
          <Button variant="success" size="lg">
            <Check size={16} /> {t('designSystem.btnCompleted')}
          </Button>
          <Button variant="danger" size="lg">
            {t('designSystem.btnReset')}
          </Button>
          <Button variant="ghost" size="lg">
            {t('designSystem.btnSkip')}
          </Button>
          <Button variant="primary" size="lg" disabled>
            <Lock size={16} /> {t('designSystem.btnLocked')}
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

      <Section title={t('designSystem.stepperTitle')}>
        <div className="flex flex-wrap items-start gap-10">
          <div className="max-w-[280px]">
            <Stepper label={t('designSystem.stepperGapLabel')} value={gap} min={0} max={64} step={4} onChange={setGap} />
          </div>
          <Stepper label={t('designSystem.stepperPaddingLabel')} value={padding} min={0} max={48} step={4} variant="dots" onChange={setPadding} />
        </div>
      </Section>

      <Section title={t('designSystem.sliderTitle')}>
        <div className="max-w-[420px]">
          <Slider value={tune} min={0} max={64} step={2} unit="px" onChange={setTune} />
        </div>
      </Section>

      <Section title={t('designSystem.segmentedTitle')}>
        <SegmentedControl
          value={density}
          onChange={setDensity}
          options={[
            { value: 'compact', label: t('designSystem.densityCompact') },
            { value: 'cozy', label: t('designSystem.densityCozy') },
            { value: 'roomy', label: t('designSystem.densityRoomy') },
          ]}
        />
      </Section>

      <Section title={t('designSystem.switchTitle')}>
        <Switch checked={notifications} onChange={setNotifications} label={t('designSystem.switchLabel')} />
      </Section>

      <Section title={t('designSystem.choiceTitle')}>
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

      <Section title={t('designSystem.pickersTitle')}>
        <div className="flex flex-col gap-8">
          <div>
            <p className="mb-3 text-footnote text-secondary">{t('designSystem.pickerAlignLabel')}</p>
            <TilePicker
              value={align}
              onChange={setAlign}
              options={[
                { value: 'left', label: t('designSystem.alignLeft'), icon: AlignLeft },
                { value: 'center', label: t('designSystem.alignCenter'), icon: AlignCenter },
                { value: 'right', label: t('designSystem.alignRight'), icon: AlignRight },
              ]}
            />
          </div>
          <div>
            <p className="mb-3 text-footnote text-secondary">{t('designSystem.pickerWhichCorrect')}</p>
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
          {t('designSystem.crystalsBadge')}
        </div>
        <p className="max-w-[600px] text-body text-secondary">
          {t('designSystem.crystalsDesc')}
        </p>
      </div>

      <Section title={t('designSystem.crystalsTitle')}>
        <CrystalShowcase />
      </Section>

      <div className="mb-8 mt-20 border-t border-border pt-10">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-footnote text-brand">
          <Sparkles size={14} />
          {t('designSystem.draftsBadge')}
        </div>
        <p className="max-w-[600px] text-body text-secondary">
          {t('designSystem.draftsDesc')}
        </p>
      </div>

      <Section title={t('designSystem.barBuilderTitle')}>
        <BarBuilder />
      </Section>

      <Section title={t('designSystem.contrastTitle')}>
        <ContrastTuner />
      </Section>

      <Section title={t('designSystem.alignTitle')}>
        <AlignSnap />
      </Section>

      <Section title={t('designSystem.matchTitle')}>
        <MatchPairs />
      </Section>

      <Section title={t('designSystem.scaleRampTitle')}>
        <ScaleRamp />
      </Section>

      <Section title={t('designSystem.hotspotTitle')}>
        <Hotspot />
      </Section>

      <Section title={t('designSystem.statesTitle')}>
        <StatesLab />
      </Section>

      <Section title={t('designSystem.trimZoneTitle')}>
        <TrimZone label="Submit" targetTrim={9} maxTrim={18} value={trim} onChange={setTrim} />
      </Section>

      <Section title={t('designSystem.nestedRadiusTitle')}>
        <NestedRadius outerRadius={24} padding={8} maxRadius={24} value={innerRadius} onChange={setInnerRadius} />
      </Section>

      <Section title={t('designSystem.fixScreenTitle')}>
        <FixTheScreen />
      </Section>

      <Section title={t('designSystem.screenWalkthroughTitle')}>
        <ScreenWalkthrough />
      </Section>

      <Section title={t('designSystem.screenCritiqueTitle')}>
        <ScreenCritique />
      </Section>

      <Section title={t('designSystem.critiqueEditorTitle')}>
        <CritiqueEditorVariants />
      </Section>

      <Section title={t('designSystem.spotDiffTitle')}>
        <SpotDiff />
      </Section>

      <Section title={t('designSystem.tapTargetTitle')}>
        <TapTarget />
      </Section>

      <Section title={t('designSystem.easingCurveTitle')}>
        <EasingCurve />
      </Section>

      <Section title={t('designSystem.focusOrderTitle')}>
        <FocusOrder />
      </Section>

      <Section title={t('designSystem.buttonHierarchyTitle')}>
        <ButtonHierarchy />
      </Section>

      <Section title={t('designSystem.breakpointTriggersTitle')}>
        <BreakpointTriggers />
      </Section>

      <Section title={t('designSystem.breakpointTunerTitle')}>
        <BreakpointTuner />
      </Section>

      <Section title={t('designSystem.gridColumnsTitle')}>
        <GridColumns />
      </Section>

      <div className="mb-8 mt-20 border-t border-border pt-10">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-footnote text-brand">
          <Sparkles size={14} />
          {t('designSystem.exercisesBadge')}
        </div>
        <p className="max-w-[560px] text-body text-secondary">
          {t('designSystem.exercisesDesc')}
        </p>
      </div>

      <Section title={t('designSystem.buildTitle')}>
        <AutoLayoutCanvas
          exercise={DEMO_BUILD}
          value={build}
          disabled={false}
          onChange={(update) => setBuild(update)}
        />
      </Section>

      <Section title={t('designSystem.orderTitle')}>
        <OrderCanvas exercise={DEMO_ORDER} value={order} disabled={false} onChange={setOrder} />
      </Section>

      <Section title={t('designSystem.tuneRadiusTitle')}>
        <div className="max-w-[420px]">
          <RadiusDragTune value={rad} min={0} max={60} onChange={setRad} />
        </div>
      </Section>

      <Section title={t('designSystem.figmaLinkTitle')}>
        <FigmaLinkSubmit value={figma} disabled={false} onChange={setFigma} />
      </Section>

      <Section title={t('designSystem.fileUploadTitle')}>
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

      <Section title={t('designSystem.videoTitle')}>
        <div className="max-w-[560px]">
          <VideoEmbed
            video={{
              url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              caption: t('designSystem.videoCaption'),
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
