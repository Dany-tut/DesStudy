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
  Eye,
  Droplet,
  Grid2x2,
  Copy,
  Pencil,
  Trash2,
  BoxSelect,
  SquareDashed,
  Group as Group2,
  GraduationCap,
  Link2,
  Shapes,
} from 'lucide-react';
import {
  PropertiesPanel,
  ScrubField,
  Field,
  ColorRow,
  GhostBtn,
  FlowChip,
  ClipToggle,
  PlusBtn,
  FIELD_STATIC,
  FIELD_INTERACTIVE,
} from '@/components/editor/PropertiesPanel';
import { SectionHeader } from '@/components/editor/SectionHeader';
import { MenuSurface, MenuItem, MenuSeparator } from '@/components/editor/Menu';
import { LayerTree } from '@/components/editor/LayerTree';
import { moveLayerInTree } from '@/lib/editor/tree';
import { StageCanvas, type FrameChrome } from '@/components/editor/StageCanvas';
import { FrameSizePanel, CanvasBackgroundPanel } from '@/components/editor/FramePresetPanel';
import { StepBar, type EditorStep } from '@/components/editor/StepBar';
import { DiffPanel } from '@/components/editor/DiffPanel';
import { ExerciseSetupPanel, Step4Access, type EditorDraft } from '@/components/editor/EditorSteps';
import type { DefectEntry } from '@/components/editor/EditorCore';
import { TypePill } from '@/components/editor/TypePill';
import { FileHeader } from '@/components/editor/FileHeader';
import { PagesPanel } from '@/components/editor/PagesPanel';
import { ColorPicker } from '@/components/editor/ColorPicker';
import { RENAME_FIELD } from '@/components/editor/renameField';
import { EditorDock, type ViewMode } from '@/components/editor/EditorDock';
import type { EditorTool, Layer } from '@/lib/editor/types';
import type { PageMeta } from '@/lib/editor/pages';

/** Fixtures. Handlers are stubbed but present: several controls render inert
 *  without one (that's their empty state), so passing them is what makes the
 *  specimen show the interactive variant. */
const PAGES: PageMeta[] = [
  { id: 'p1', kind: 'page', name: 'Обложка' },
  { id: 'p2', kind: 'page', name: 'Страница 1' },
  { id: 'd1', kind: 'divider', name: 'Экраны' },
  { id: 'p3', kind: 'page', name: 'Страница 2' },
];

const TEXT_LAYER: Layer = {
  id: 'l-text',
  name: 'Заголовок',
  type: 'text',
  props: { text: 'Кем я могу быть?', fontSize: 24, fontWeight: '600', color: '#14171C', opacity: 1 },
  children: [],
};

const STROKE_LAYER: Layer = {
  id: 'l-stroke',
  name: 'Карточка',
  type: 'block',
  props: { fill: '#5B6EF5', stroke: '#1A1A1A', strokeWidth: 1, radius: 12, opacity: 1 },
  children: [],
};

const PLAIN_LAYER: Layer = {
  id: 'l-plain',
  name: 'Блок',
  type: 'block',
  props: { fill: '#3FB950', radius: 8, opacity: 1 },
  children: [],
};

/** A tree that exercises every row the panel can draw: each layer type, real
 *  frames vs plain groups (a frame has `clip`, a group doesn't — that's what
 *  picks the glyph), an explicit auto-layout, and enough nesting for the indent
 *  guides to have something to guide. */
const mkLayer = (id: string, name: string, type: Layer['type'], props: Layer['props'] = {}, children: Layer[] = []): Layer =>
  ({ id, name, type, props, children });

const TREE: Layer[] = [
  mkLayer('f1', 'Эталон', 'frame', { clip: true, frame: true }, [
    mkLayer('g1', 'Шапка', 'frame', {}, [
      mkLayer('t1', 'Заголовок', 'text', { text: 'Кем я могу быть?' }),
      mkLayer('b1', 'Кнопка', 'block', { fill: '#5B6EF5', radius: 8 }),
    ]),
    mkLayer('a1', 'Карточки', 'frame', { clip: true, frame: true, layout: 'row' }, [
      mkLayer('i1', 'Фото', 'image'),
      mkLayer('v1', 'Иконка', 'vector'),
    ]),
    mkLayer('b2', 'Подложка', 'block', { fill: '#EEF0F4' }),
  ]),
  mkLayer('f2', 'Сломанный', 'frame', { clip: true, frame: true }, [
    mkLayer('t2', 'Заголовок', 'text', { text: 'Кем я могу быть?' }),
    mkLayer('v2', 'Вектор', 'vector'),
  ]),
];

/**
 * A screen for the stage. `data-layer-id` is the contract between the markup and
 * the tree — the canvas finds a layer's node by it to draw selection and hover —
 * so a fixture without those ids would render pixels the stage can't address.
 */
const STAGE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" width="320" height="200">
  <g data-layer-id="sf1" data-name="Эталон">
    <rect data-layer-id="sbg" x="0" y="0" width="320" height="200" rx="12" fill="#FFFFFF"/>
    <rect data-layer-id="shd" x="16" y="16" width="288" height="40" rx="8" fill="#EEF0F4"/>
    <rect data-layer-id="scta" x="16" y="140" width="120" height="40" rx="8" fill="#5B6EF5"/>
    <circle data-layer-id="sav" cx="280" cy="36" r="12" fill="#3FB950"/>
  </g>
</svg>`;

const STAGE_FRAMES: FrameChrome[] = [{ id: 'sf1', name: 'Эталон', role: 'reference' }];
const STAGE_FRAMES_FLAWED: FrameChrome[] = [{ id: 'sf1', name: 'Сломанный', role: 'flawed' }];
const STAGE_FRAMES_PLAIN: FrameChrome[] = [{ id: 'sf1', name: 'Фрейм 1' }];

const DEFECTS: DefectEntry[] = [
  {
    frameId: 'sf1',
    frameName: 'Сломанный',
    layerId: 'scta',
    layerName: 'Кнопка',
    deltas: [
      { prop: 'radius', was: '8', now: '0' },
      { prop: 'fill', was: '#5B6EF5', now: '#9AA0AE' },
    ],
  },
  {
    frameId: 'sf1',
    frameName: 'Сломанный',
    layerId: 'shd',
    layerName: 'Шапка',
    deltas: [{ prop: 'opacity', was: '100%', now: '40%' }],
  },
];

const DRAFT: EditorDraft = {
  title: 'Разбор экрана',
  kind: 'critique',
  zones: [],
  access: 'PUBLIC',
  audience: '',
};

/** One labelled specimen. `note` carries the rule the element encodes — the part
 *  a screenshot can't tell you. */
function Spec({
  name,
  note,
  wide,
  children,
}: {
  name: string;
  note?: string;
  /** For elements that don't live in the rail (the home header's pills), where a
   *  rail-width frame would misrepresent the room they actually get. */
  wide?: boolean;
  children: React.ReactNode;
}) {
  // w-[240px] = the rail's width. The specimen frame carries the same p-3 the
  // rail does, so the control inside lands on the rail's real 216px content
  // width — measure the frame, not the control, or every specimen shows up 24px
  // tighter than it will ever be in the editor. It caps the whole specimen, not
  // just the panel: left to itself the note is one long line that stretches the
  // flex item and pushes the specimens into a single column.
  // Order is name → element → note on purpose: notes vary in length, so putting
  // them above would start each panel at a different height and the row of
  // specimens would no longer line up.
  return (
    <div className={`flex flex-col gap-2 ${wide ? 'w-[460px]' : 'w-[240px]'}`}>
      <p className="text-footnote font-medium text-primary">{name}</p>
      <div className="rounded-lg border border-border bg-elevated p-3">{children}</div>
      {note && <p className="text-caption leading-snug text-tertiary">{note}</p>}
    </div>
  );
}

/**
 * The tree always sits in a scrolling panel in the rail, and it has to here too
 * — not for looks. A row that becomes the primary selection centres itself by
 * walking up to the nearest scrollable ancestor; with no scroller of its own the
 * walk reaches the page, and every specimen that mounts with a selection yanks
 * the gallery's scroll position. The height is deliberately short enough that
 * this fixture overflows it, so the walk stops here.
 */
function TreePanel({ children }: { children: React.ReactNode }) {
  return <div className="max-h-56 overflow-y-auto">{children}</div>;
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
  const [dragTree, setDragTree] = useState<Layer[]>(TREE);
  const [dragSel, setDragSel] = useState<string[]>([]);
  const [stageSel, setStageSel] = useState<string[]>([]);
  const [stageHover, setStageHover] = useState<string | null>(null);
  const [canvasBg, setCanvasBg] = useState('#0B0D11');
  const [step, setStep] = useState<EditorStep>(1);
  const [draft, setDraft] = useState<EditorDraft>(DRAFT);

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
          <div className="grid grid-cols-2 gap-1">
            <ScrubField label="Ш" value={w} onCommit={setW} min={1} />
            <ScrubField label="В" value={h} onCommit={setH} min={1} />
          </div>
        </Spec>
        <Spec
          name="С иконкой и единицей"
          note="Глиф вместо слова, когда ярлык шире значения. Прозрачность клампится 0–100 и несёт суффикс «%»."
        >
          <div className="grid grid-cols-2 gap-1">
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
          <div className="grid grid-cols-2 gap-1">
            <Field label="X" value="Mixed" />
            <Field label="Y" value="Mixed" />
          </div>
        </Spec>
      </Group>

      <Group title="Шапка блока — эталон">
        <Spec
          name="Голая"
          note="Position, Layout. Блоку нечего предложить в шапке — только имя."
        >
          <SectionHeader title="Позиция" />
          <SectionHeader title="Раскладка" />
        </Spec>

        <Spec
          name="Состояние слоя"
          note="Appearance. Две глиф-кнопки: видимость и режим наложения. Не «+» — они переключают то, что уже есть, а не добавляют новое."
        >
          <SectionHeader
            title="Внешний вид"
            actions={
              <>
                <GhostBtn Icon={Eye} onClick={() => {}} />
                <GhostBtn Icon={Droplet} onClick={() => {}} />
              </>
            }
          />
        </Spec>

        <Spec
          name="Список — стили + добавить"
          note="Fill, Stroke, Effects с содержимым. Слева — выбор стиля из библиотеки, справа — добавить ещё одну строку в список."
        >
          <SectionHeader
            title="Заливка"
            actions={
              <>
                <GhostBtn Icon={Grid2x2} onClick={() => {}} />
                <PlusBtn onClick={() => {}} title="Добавить заливку" />
              </>
            }
          />
          <SectionHeader
            title="Обводка"
            actions={
              <>
                <GhostBtn Icon={Grid2x2} onClick={() => {}} />
                <PlusBtn onClick={() => {}} title="Добавить обводку" />
              </>
            }
          />
        </Spec>

        <Spec
          name="Только добавить"
          note="Export. Библиотеки стилей тут не при чём — добавлять можно, выбирать не из чего."
        >
          <SectionHeader title="Экспорт" actions={<PlusBtn onClick={() => {}} title="Добавить" />} />
        </Spec>

        <Spec
          name="Пустой блок"
          note="Effects без единого эффекта. Заголовок гаснет до tertiary: пустой блок — это предложение, а не содержимое, и он не должен спорить за внимание с заполненными."
        >
          <SectionHeader title="Эффекты" muted actions={<PlusBtn onClick={() => {}} title="Добавить" />} />
        </Spec>

        <Spec
          name="Два уровня подписи"
          note="Заголовок блока — footnote/semibold/primary, подпись поля — caption/regular/tertiary. Шаг сразу в размере, насыщенности и цвете: иначе панель читается как сплошной список и блок приходится искать глазами."
        >
          <SectionHeader
            title="Внешний вид"
            actions={<GhostBtn Icon={Eye} onClick={() => {}} />}
          />
          <div className="flex items-start gap-1.5">
            <div className="min-w-0 flex-1">
              <ScrubField label="Прозрачность" Icon={Blend} value={opacity} onCommit={setOpacity} min={0} max={100} suffix="%" />
            </div>
            <div className="min-w-0 flex-1">
              <ScrubField label="Скругление" Icon={Scan} value={radius} onCommit={setRadius} min={0} />
            </div>
          </div>
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
          wide
          note="Мягкая заливка 10% на токенах brand / warning / success — обе темы отрабатывают сами. Живут в шапке «Уроки», а не в рейле, поэтому образец шире."
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <TypePill icon={GraduationCap} tone="lesson" label="Урок" title="Разные задания" onClick={() => {}} />
            <TypePill icon={Link2} tone="figma" label="Figma" title="Одно задание со ссылкой" onClick={() => {}} />
            <TypePill icon={Shapes} tone="make" label="Make" title="Редактор экрана · загрузка SVG" onClick={() => {}} />
          </div>
        </Spec>
      </Group>

      <Group title="Строка слоя">
        <Spec
          name="Типы и вложенность"
          note="Глиф читается из слоя, а не задаётся: настоящий фрейм (свои границы, clip) получает иконку фрейма, простая группа — пунктирную рамку, явный авто-макет — стрелки потока. Хайрлайн на каждый уровень вложенности."
        >
          <TreePanel>
            <LayerTree layers={TREE} selectedIds={[]} onSelect={() => {}} onHover={() => {}} />
          </TreePanel>
        </Spec>

        <Spec
          name="Выделение подряд"
          note="Соседние выделенные строки склеиваются в один блок: скругляются только концы серии, а не каждая строка. Иначе выделение читается стопкой пилюль вместо одного диапазона."
        >
          <TreePanel>
            <LayerTree layers={TREE} selectedIds={['t1', 'b1']} onSelect={() => {}} onHover={() => {}} />
          </TreePanel>
        </Spec>

        <Spec
          name="Выбрана группа"
          note="Выделена группа — подсвечено всё её поддерево, слабее самой группы. Так на холсте: взял группу — взял всё внутри."
        >
          <TreePanel>
            <LayerTree layers={TREE} selectedIds={['g1']} onSelect={() => {}} onHover={() => {}} />
          </TreePanel>
        </Spec>

        <Spec
          name="Роли и зоны"
          note="Эталон зелёный, сломанный красный — цвет заливает весь фрейм, а не только строку с бейджем. Мишень = зона критики: то, что студент будет разбирать."
        >
          <TreePanel>
            <LayerTree
              layers={TREE}
              selectedIds={[]}
              onSelect={() => {}}
              onHover={() => {}}
              referenceIds={new Set(['f1'])}
              flawedIds={new Set(['f2'])}
              zoneIds={new Set(['b1', 'v2'])}
            />
          </TreePanel>
        </Spec>

        <Spec
          name="Переименование"
          note="То же поле, что в шапке файла и страницах — рамка outline, строка не скачет."
          wide
        >
          <TreePanel>
            <LayerTree
              layers={TREE}
              selectedIds={['t1']}
              onSelect={() => {}}
              onHover={() => {}}
              onRename={() => {}}
              renameId="t1"
              onRenameHandled={() => {}}
            />
          </TreePanel>
        </Spec>

        <Spec
          name="Живой drag-n-drop"
          wide
          note="Тащи строку: верх/низ группы — переставить рядом (синяя линия), середина — вложить внутрь (рамка). Alt — копия. В своё поддерево бросить нельзя. Перемещение — та же moveLayerInTree, что в редакторе, поэтому витрина не разойдётся с приложением."
        >
          <TreePanel>
            <LayerTree
              layers={dragTree}
              selectedIds={dragSel}
              onSelect={(id) => setDragSel([id])}
              onHover={() => {}}
              onReparent={(dragId, targetId, pos, copy) => {
                // Copy isn't wired: cloning needs fresh ids, which is EditorCore's
                // job (it also has to clone the SVG nodes). Alt still shows the
                // copy cursor — the indicator is what this specimen documents.
                if (copy) return;
                const next = moveLayerInTree(dragTree, dragId, targetId, pos);
                if (next) setDragTree(next);
              }}
            />
          </TreePanel>
        </Spec>
      </Group>

      <Group title="Контекстное меню — эталон">
        <Spec
          name="Пункты меню"
          wide
          note="Радиус пункта — 14px, не на глаз: поверхность rounded-xl (20px) минус её же p-1.5 (6px) даёт концентричный внутренний угол. У меню слоёв там 10px — угол пункта туже, чем обнимающая его поверхность."
        >
          <MenuSurface>
            <MenuItem icon={<Rows3 size={14} />} label="Авто-макет · вертикальный" />
            <MenuItem icon={<Group2 size={14} />} label="Сгруппировать" shortcut="⌘G" />
            <MenuItem icon={<Copy size={14} />} label="Дублировать как сломанный" />
            <MenuSeparator />
            <MenuItem icon={<Pencil size={14} />} label="Переименовать" />
            <MenuItem icon={<Trash2 size={14} />} label="Удалить" danger />
          </MenuSurface>
        </Spec>
        <Spec
          name="Состояния"
          wide
          note="Разделитель — не декор: всё разрушительное живёт под ним, а не встык с рутинным действием. Danger — красный текст плюс подложка на hover: один текст объявляет последствие только когда курсор уже на пункте."
        >
          <MenuSurface>
            <MenuItem icon={<BoxSelect size={14} />} label="Выделить всё" shortcut="⌘A" />
            <MenuItem icon={<SquareDashed size={14} />} label="Снять выделение" disabled />
            <MenuSeparator />
            <MenuItem icon={<Trash2 size={14} />} label="Удалить" danger />
            <MenuItem icon={<Trash2 size={14} />} label="Удалить" danger disabled />
          </MenuSurface>
        </Spec>
      </Group>

      <Group title="Шапка файла">
        <Spec
          name="Сохранён"
          note="Имя — двойной клик правит на месте. Статус и бейдж «Черновик» строкой ниже, стрелка выходит на главную, «+файл» грузит SVG в открытую страницу."
        >
          <FileHeader name="screen" onRename={() => {}} saved onAddFile={() => {}} onBack={() => {}} />
        </Spec>
        <Spec
          name="Только в браузере"
          note="Автосейв в уроки ещё не прошёл. Статус — единственное, что отличает состояния: сама шапка не дёргается."
        >
          <FileHeader name="Без названия" onRename={() => {}} saved={false} onAddFile={() => {}} onBack={() => {}} onCollapse={() => {}} />
        </Spec>
      </Group>

      <Group title="Страницы">
        <Spec
          name="Список страниц"
          note="Активная — заливка brand/10. Звезда = обложка, она даёт файлу превью. Разделитель — подпись между хайрлайнами, а не строка."
        >
          <PagesPanel
            items={PAGES}
            activeId="p2"
            coverId="p1"
            collapsed={false}
            onToggleCollapsed={() => {}}
            onSelect={() => {}}
            onAddPage={() => {}}
            onAddDivider={() => {}}
            onRename={() => {}}
            onDelete={() => {}}
            onSetCover={() => {}}
          />
        </Spec>
        <Spec name="Свёрнутый" note="Шевроном в шапке. Строки скрыты, «+» остаётся.">
          <PagesPanel
            items={PAGES}
            activeId="p2"
            coverId="p1"
            collapsed
            onToggleCollapsed={() => {}}
            onSelect={() => {}}
            onAddPage={() => {}}
            onAddDivider={() => {}}
            onRename={() => {}}
            onDelete={() => {}}
            onSetCover={() => {}}
          />
        </Spec>
      </Group>

      <Group title="Пикер цвета">
        <Spec
          name="Свёрнутый"
          note="Строка мимикрирует под ячейку поля — заливка стоит в той же колонке, что остальные свойства. Клик раскрывает пикер."
        >
          <ColorPicker value={fill} onChange={setFill} opacity={opacity / 100} onOpacityChange={(v) => setOpacity(Math.round(v * 100))} />
        </Spec>
        <Spec name="Без прозрачности" note="Без onOpacityChange слайдера нет, процент статичный.">
          <ColorPicker value="#3FB950" onChange={() => {}} />
        </Spec>
      </Group>

      <Group title="Панель свойств — секции целиком">
        <Spec
          name="Текстовый слой"
          note="Секция «Текст» появляется только у text-слоя — панель показывает то, что у слоя есть, а не всё подряд."
        >
          <PropertiesPanel layer={TEXT_LAYER} onText={() => {}} onFill={() => {}} onOpacity={() => {}} />
        </Spec>
        <Spec
          name="Обводка"
          note="Есть обводка — цвет, толщина и «убрать». Нет — секция гаснет и остаётся только «+»."
        >
          <PropertiesPanel layer={STROKE_LAYER} onStroke={() => {}} onStrokeWidth={() => {}} onRadius={() => {}} />
        </Spec>
        <Spec
          name="Без обводки"
          note="Тот же слой без stroke: приглушённый заголовок и «+», как у пустых Effects."
        >
          <PropertiesPanel layer={PLAIN_LAYER} onStroke={() => {}} onRadius={() => {}} />
        </Spec>
      </Group>

      <Group title="Панель свойств — разделение секций">
        <Spec
          name="Разделители"
          note="Секции разделены хайрлайном снизу, последняя — без него. Как в Figma: границы блоков читаются, но панель остаётся единым полотном."
        >
          <PropertiesPanel
            layer={STROKE_LAYER}
            chrome="divider"
            onStroke={() => {}}
            onStrokeWidth={() => {}}
            onRadius={() => {}}
            onFill={() => {}}
            onOpacity={() => {}}
          />
        </Spec>
        <Spec
          name="Рамка вокруг секции"
          note="Каждый блок — своя скруглённая рамка на чуть более светлой подложке, между ними зазор. Границы явные, блоки читаются как карточки — ценой лишней обводки и отступов."
        >
          <PropertiesPanel
            layer={STROKE_LAYER}
            chrome="card"
            onStroke={() => {}}
            onStrokeWidth={() => {}}
            onRadius={() => {}}
            onFill={() => {}}
            onOpacity={() => {}}
          />
        </Spec>
      </Group>

      <Group title="Холст">
        <div className="w-full">
          <p className="mb-2 text-footnote font-medium text-primary">Сцена</p>
          {/* The stage is an infinite, pannable surface — it fills whatever box it
              is given. In the editor that's the centre column; here it needs an
              explicit one, or it collapses to nothing. */}
          <div className="relative h-[320px] w-full overflow-hidden rounded-lg border border-border">
            <StageCanvas
              svg={STAGE_SVG}
              width={320}
              height={200}
              selectedIds={stageSel}
              hoveredId={stageHover}
              onSelect={(id) => setStageSel(id ? [id] : [])}
              onHover={setStageHover}
              onMoveLayers={() => {}}
              onContextMenu={(e) => e.preventDefault()}
              frames={STAGE_FRAMES_PLAIN}
              zoneIds={new Set(['scta'])}
            />
          </div>
          <p className="mt-2 max-w-[720px] text-caption leading-snug text-tertiary">
            Кликни слой — рамка выделения и ручки. ⌘/Ctrl+колесо — зум, пробел — рука. Всё живёт в одном
            CSS-слое с матрицей translate+scale, поэтому пан и зум — одно преобразование, а не пересчёт координат
            каждого узла.
          </p>
        </div>

        <Spec
          name="Подпись фрейма · обычный"
          note="Имя над фреймом, двойной клик — переименовать. Размеры делятся на масштаб, поэтому подпись не растёт вместе с зумом."
        >
          <div className="relative h-[180px] overflow-hidden rounded-md border border-border">
            <StageCanvas
              svg={STAGE_SVG}
              width={320}
              height={200}
              selectedIds={[]}
              hoveredId={null}
              onSelect={() => {}}
              onHover={() => {}}
              onMoveLayers={() => {}}
              onContextMenu={(e) => e.preventDefault()}
              frames={STAGE_FRAMES_PLAIN}
              onRename={() => {}}
              onCycleFrameRole={() => {}}
            />
          </div>
        </Spec>

        <Spec
          name="Эталон"
          note="Роль ставится прямо на холсте — клик по глифу у подписи. Зелёный = правильный оригинал."
        >
          <div className="relative h-[180px] overflow-hidden rounded-md border border-border">
            <StageCanvas
              svg={STAGE_SVG}
              width={320}
              height={200}
              selectedIds={[]}
              hoveredId={null}
              onSelect={() => {}}
              onHover={() => {}}
              onMoveLayers={() => {}}
              onContextMenu={(e) => e.preventDefault()}
              frames={STAGE_FRAMES}
              onCycleFrameRole={() => {}}
            />
          </div>
        </Spec>

        <Spec
          name="Сломанный"
          note="Красный = версия с подсаженными дефектами. Клик по глифу гоняет роль по кругу: обычный → эталон → сломанный."
        >
          <div className="relative h-[180px] overflow-hidden rounded-md border border-border">
            <StageCanvas
              svg={STAGE_SVG}
              width={320}
              height={200}
              selectedIds={[]}
              hoveredId={null}
              onSelect={() => {}}
              onHover={() => {}}
              onMoveLayers={() => {}}
              onContextMenu={(e) => e.preventDefault()}
              frames={STAGE_FRAMES_FLAWED}
              onCycleFrameRole={() => {}}
            />
          </div>
        </Spec>
      </Group>

      <Group title="Пресеты и фон">
        <Spec name="Размер фрейма" note="Появляется при инструменте «Фрейм» — либо взять пресет, либо нарисовать рамку.">
          <div className="max-h-64 overflow-y-auto">
            <FrameSizePanel onPick={() => {}} />
          </div>
        </Spec>
        <Spec name="Фон холста" note="Пресеты плюс произвольный цвет. Отдельный от заливки фрейма — это страница, а не слой.">
          <CanvasBackgroundPanel value={canvasBg} onChange={setCanvasBg} />
        </Spec>
      </Group>

      <Group title="Шаги">
        <div className="w-full">
          <p className="mb-2 text-footnote font-medium text-primary">Флоу задания</p>
          <div className="relative flex h-[110px] w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-canvas">
            <StepBar step={step} onStep={setStep} enabledThrough={2} />
          </div>
          <p className="mt-2 max-w-[720px] text-caption leading-snug text-tertiary">
            Два шага: «Редактор» (слои, роли, зоны) и «Доступ» (тип и публикация). Шаги дальше
            <code className="mx-1 rounded-sm bg-muted px-1">enabledThrough</code> заперты и приглушены — флоу
            не даёт опубликовать то, что ещё не собрано.
          </p>
        </div>
      </Group>

      <Group title="Отличия от эталона">
        <Spec
          name="Найденные дефекты"
          wide
          note="Авто-диф эталона и сломанного: сгруппировано по фрейму, у каждого слоя — что было и что стало. «Критерий» повышает отличие до зоны критики, которую будет разбирать студент."
        >
          <DiffPanel
            defects={DEFECTS}
            criterionLayerIds={new Set(['shd'])}
            selectedId={null}
            onSelect={() => {}}
            onToggleCriterion={() => {}}
          />
        </Spec>
      </Group>

      <Group title="Настройка задания">
        <Spec
          name="Тип задания"
          note="Показывается справа, когда слой не выбран. От типа зависит, нужен ли сломанный вариант."
        >
          <ExerciseSetupPanel draft={draft} onKind={(kind) => setDraft({ ...draft, kind })} onBroken={() => {}} />
        </Spec>
        <Spec
          name="Доступ и публикация"
          wide
          note="Финальный шаг. Счётчик зон — не украшение: без зон разбирать нечего, и это единственное место, где видно, что задание пустое."
        >
          <Step4Access
            draft={draft}
            zoneCount={2}
            onPatch={(patch) => setDraft({ ...draft, ...patch })}
            onSave={() => {}}
            onPublish={() => {}}
          />
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
