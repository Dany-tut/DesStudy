'use client';

/**
 * Make — the SVG screen editor's own chrome, taken apart.
 *
 * Every specimen below imports the REAL component the editor renders, never a
 * lookalike: a copied swatch drifts from the app the first time someone tweaks
 * the original, and a design system that lies is worse than none. That is also
 * why the atoms had to be exported from PropertiesPanel / EditorCore rather
 * than reproduced here.
 *
 * The editor's controls are drawn for a 240px rail on `bg-elevated`, at
 * caption/footnote sizes — so each specimen sits on a rail-width elevated panel.
 * Shown on this page's canvas background at full width they would read as a
 * different, roomier control than the one that actually ships.
 */

import { useState } from 'react';
import {
  Columns3,
  Rows3,
  LayoutGrid,
  Blend,
  Scan,
  Minus,
  Plus,
  GraduationCap,
  Link2,
  Shapes,
} from 'lucide-react';
import {
  ScrubField,
  Section as PropSection,
  Field,
  ColorRow,
  GhostBtn,
  FlowChip,
  ClipToggle,
  PlusBtn,
  FIELD_STATIC,
  FIELD_INTERACTIVE,
} from '@/components/editor/PropertiesPanel';
import { TypePill } from '@/components/editor/TypePill';
import { RENAME_FIELD } from '@/components/editor/renameField';
import { EditorDock, type ViewMode } from '@/components/editor/EditorDock';
import type { EditorTool } from '@/lib/editor/types';

/** One labelled specimen. `note` carries the rule the element encodes — the part
 *  a screenshot can't tell you. */
function Spec({
  name,
  note,
  children,
}: {
  name: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <p className="text-footnote font-medium text-primary">{name}</p>
        {note && <p className="mt-0.5 text-caption leading-snug text-tertiary">{note}</p>}
      </div>
      {/* w-[216px] = the rail's 240px minus its px-3 gutters — the width these
          controls are actually laid out for. */}
      <div className="w-[216px] rounded-lg border border-border bg-elevated p-3">{children}</div>
    </div>
  );
}

/** A row of specimens that share a theme. */
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h3 className="mb-4 text-callout font-semibold text-secondary">{title}</h3>
      <div className="flex flex-wrap gap-8">{children}</div>
    </div>
  );
}

export function MakeBlock() {
  const [x, setX] = useState(24);
  const [y, setY] = useState(160);
  const [w, setW] = useState(320);
  const [h, setH] = useState(48);
  const [radius, setRadius] = useState(12);
  const [opacity, setOpacity] = useState(100);
  const [fill, setFill] = useState('#5B6EF5');
  const [flow, setFlow] = useState<'row' | 'column' | 'grid' | 'none'>('row');
  const [clip, setClip] = useState(true);
  const [renaming, setRenaming] = useState('Фрейм 1');
  const [tool, setTool] = useState<EditorTool>('move');
  const [viewMode, setViewMode] = useState<ViewMode>('editor');

  return (
    <div>
      <Group title="Ячейка поля">
        <Spec
          name="Статичная"
          note="Read-only. Мягкая заливка и еле заметная рамка — значение видно, но трогать нечего."
        >
          <div className={`${FIELD_STATIC} gap-2`}>
            <span className="text-caption text-tertiary">X</span>
            <span className="text-caption tabular-nums text-primary">24</span>
          </div>
        </Spec>
        <Spec
          name="Интерактивная"
          note="Hover уплотняет рамку до border-strong, фокус меняет её на brand + мягкий ring. Внутренний input гасит свой :focus-visible, иначе рамка задвоится."
        >
          <label className={`${FIELD_INTERACTIVE} gap-2`}>
            <span className="text-caption text-tertiary">X</span>
            <input
              defaultValue="24"
              className="w-full min-w-0 bg-transparent text-caption tabular-nums text-primary !outline-none focus-visible:!outline-none"
            />
          </label>
        </Spec>
      </Group>

      <Group title="Числовое поле — скрабируемое">
        <Spec
          name="Позиция"
          note="Ярлык — это ручка: тяни влево-вправо, значение меняется живьём. Ввод текстом коммитится на Enter/blur."
        >
          <div className="flex items-center gap-1.5">
            <ScrubField label="X" value={x} onCommit={setX} allowNeg />
            <ScrubField label="Y" value={y} onCommit={setY} allowNeg />
          </div>
        </Spec>
        <Spec name="Размер" note="min=1 — ширина и высота не уходят в ноль и минус.">
          <div className="flex items-center gap-1.5">
            <ScrubField label="Ш" value={w} onCommit={setW} min={1} />
            <ScrubField label="В" value={h} onCommit={setH} min={1} />
          </div>
        </Spec>
        <Spec
          name="С иконкой и единицей"
          note="Глиф вместо слова, когда ярлык шире значения. Прозрачность клампится 0–100 и несёт суффикс «%»."
        >
          <div className="flex items-center gap-1.5">
            <ScrubField
              label="Прозрачность"
              Icon={Blend}
              value={opacity}
              onCommit={setOpacity}
              min={0}
              max={100}
              suffix="%"
            />
            <ScrubField label="Радиус" Icon={Scan} value={radius} onCommit={setRadius} min={0} />
          </div>
        </Spec>
        <Spec name="Смешанное значение" note="Разные значения в мультивыборе — «Mixed» вместо числа.">
          <div className="flex items-center gap-1.5">
            <Field label="X" value="Mixed" />
            <Field label="Y" value="Mixed" />
          </div>
        </Spec>
      </Group>

      <Group title="Заголовок секции">
        <Spec name="С действием" note="Секции разделены хайрлайном; у последней его нет.">
          <PropSection title="Эффекты" action={<PlusBtn title="Добавить" onClick={() => {}} />}>
            <div className={`${FIELD_STATIC} gap-2`}>
              <span className="text-caption text-tertiary">Нет эффектов</span>
            </div>
          </PropSection>
          <PropSection title="Приглушённая" muted last />
        </Spec>
      </Group>

      <Group title="Заливка">
        <Spec
          name="Интерактивная"
          note="Клик открывает пикер — цвет и прозрачность в одном контроле."
        >
          <ColorRow value={fill} onChange={setFill} opacity={opacity / 100} onOpacity={(v) => setOpacity(Math.round(v * 100))} />
        </Spec>
        <Spec name="Статичная" note="Без onChange — образец, hex и прозрачность просто читаются.">
          <ColorRow value="#3FB950" />
        </Spec>
      </Group>

      <Group title="Раскладка">
        <Spec
          name="Поток авто-макета"
          note="Активный чип остаётся кликабельным — повторный клик выключает раскладку, поэтому у него свои hover/press, а не inert."
        >
          <div className="flex items-center gap-1">
            <FlowChip
              Icon={Columns3}
              label="Ряд"
              active={flow === 'row'}
              onClick={() => setFlow(flow === 'row' ? 'none' : 'row')}
            />
            <FlowChip
              Icon={Rows3}
              label="Колонка"
              active={flow === 'column'}
              onClick={() => setFlow(flow === 'column' ? 'none' : 'column')}
            />
            <FlowChip
              Icon={LayoutGrid}
              label="Сетка"
              active={flow === 'grid'}
              onClick={() => setFlow(flow === 'grid' ? 'none' : 'grid')}
            />
          </div>
        </Spec>
        <Spec name="Обрезка содержимого" note="Только у настоящего фрейма — у простой группы clip нет, как в Figma.">
          <ClipToggle checked={clip} onChange={setClip} />
        </Spec>
      </Group>

      <Group title="Иконочные кнопки">
        <Spec
          name="Ghost / Plus"
          note="Никогда не сплошная заливка: непрозрачный квадрат тут читается как дырка в панели. Только полупрозрачный bg-hover под глифом."
        >
          <div className="flex items-center gap-2">
            <GhostBtn Icon={Minus} onClick={() => {}} />
            <GhostBtn Icon={Plus} onClick={() => {}} />
            <PlusBtn onClick={() => {}} title="Добавить" />
            <span className="ml-2 text-caption text-tertiary">инертные:</span>
            <GhostBtn Icon={Minus} />
            <PlusBtn />
          </div>
        </Spec>
      </Group>

      <Group title="Переименование">
        <Spec
          name="Поле переименования"
          note="Один стиль на все четыре места: имя файла, страницы, слои, подпись фрейма. Рамка — outline, а не border: она вне бокса, поэтому строка не скачет."
        >
          <input
            value={renaming}
            onChange={(e) => setRenaming(e.target.value)}
            className={`${RENAME_FIELD} w-full px-1 py-0.5 text-footnote`}
          />
        </Spec>
      </Group>

      <Group title="Таблетки типов">
        <Spec
          name="Тип урока"
          note="Мягкая заливка 10% на токенах brand / warning / success — обе темы отрабатывают сами."
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <TypePill icon={GraduationCap} tone="lesson" label="Урок" title="Разные задания" onClick={() => {}} />
            <TypePill icon={Link2} tone="figma" label="Figma" title="Одно задание со ссылкой" onClick={() => {}} />
            <TypePill icon={Shapes} tone="make" label="Make" title="Редактор экрана · загрузка SVG" onClick={() => {}} />
          </div>
        </Spec>
      </Group>

      <Group title="Нижний бар">
        <div className="relative h-[120px] w-full overflow-hidden rounded-lg border border-border bg-canvas">
          {/* The dock is `fixed`-positioned against the stage in the editor; this
              wrapper just gives it a canvas to sit on. */}
          <EditorDock tool={tool} onTool={(c) => setTool(c.tool)} viewMode={viewMode} onViewMode={setViewMode} />
        </div>
      </Group>
    </div>
  );
}
