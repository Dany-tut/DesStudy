'use client';

import { useEffect, useState } from 'react';
import { Palette, Accessibility } from 'lucide-react';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Switch } from '@/components/ui/Switch';
import {
  type Settings,
  type ThemePref,
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  applySettings,
} from '@/lib/settings';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  // Hydrate from localStorage on mount (SSR renders defaults, then we sync).
  useEffect(() => {
    setSettings(loadSettings());
    setReady(true);
  }, []);

  function update(patch: Partial<Settings>) {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      applySettings(next);
      saveSettings(next);
      return next;
    });
  }

  return (
    <main className="mx-auto max-w-[640px] px-6 py-12 md:py-16">
      <h1 className="text-title1 font-bold text-primary">Настройки</h1>
      <p className="mt-2 text-body text-secondary">
        Всё применяется сразу и сохраняется на этом устройстве.
      </p>

      <div className="mt-10 flex flex-col gap-8" aria-busy={!ready}>
        {/* Appearance */}
        <Section icon={<Palette size={18} />} title="Оформление">
          <Row label="Тема" hint="«Система» следует за настройкой ОС.">
            <SegmentedControl<ThemePref>
              options={[
                { value: 'system', label: 'Система' },
                { value: 'light', label: 'Светлая' },
                { value: 'dark', label: 'Тёмная' },
              ]}
              value={settings.theme}
              onChange={(theme) => update({ theme })}
            />
          </Row>
        </Section>

        {/* Accessibility */}
        <Section icon={<Accessibility size={18} />} title="Доступность">
          <Row
            label="Приглушённые анимации"
            hint="Убирает движение переходов — для чувствительных к анимации."
          >
            <Switch
              checked={settings.reduceMotion}
              onChange={(reduceMotion) => update({ reduceMotion })}
            />
          </Row>
          <Row label="Высокий контраст" hint="Усиливает границы и приглушённый текст.">
            <Switch
              checked={settings.highContrast}
              onChange={(highContrast) => update({ highContrast })}
            />
          </Row>
        </Section>
      </div>
    </main>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-6">
      <div className="mb-5 flex items-center gap-2.5 text-callout font-semibold text-primary">
        <span className="text-brand">{icon}</span>
        {title}
      </div>
      <div className="flex flex-col divide-y divide-border">{children}</div>
    </section>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-4 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <div className="text-body font-medium text-primary">{label}</div>
        {hint && <div className="mt-0.5 text-footnote text-tertiary">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
