'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  MousePointer2,
  Frame,
  Square,
  PenTool,
  MessageCircle,
  Sparkles,
  FileText,
  FolderOpen,
  Package,
  Trash2,
  Users,
  PenLine,
  Presentation,
  Megaphone,
  Globe,
  Code2,
  Pencil,
  Files,
  FileStack,
  Layers,
  Play,
  Palette,
  SlidersHorizontal,
  PencilRuler,
  type LucideIcon,
} from 'lucide-react';
import { ExampleVisual } from './ExampleVisual';

/**
 * Interactive schemas for the Figma intro lecture — the click-to-reveal
 * versions of the deck's annotated screenshots (toolbar, home interface, modes).
 * Falls back to the static ExampleVisual registry for any other key, so a
 * section's `visual` can point at either.
 */
export function LectureVisual({ visual }: { visual: string }) {
  if (visual === 'figma-toolbar') return <Picker items={TOOLBAR} />;
  if (visual === 'figma-canvas') return <Picker items={CANVAS_PANELS} />;
  if (visual === 'figma-modes') return <Picker items={MODES} />;
  if (visual === 'figma-interface') {
    return (
      <div className="space-y-6">
        <PickerBlock label="Создать файл" items={FILE_TYPES} />
        <PickerBlock label="Меню слева" items={MENU} />
      </div>
    );
  }
  return <ExampleVisual visual={visual} />;
}

interface PickItem {
  id: string;
  label: string;
  icon: LucideIcon;
  detail: string;
}

function PickerBlock({ label, items }: { label: string; items: PickItem[] }) {
  return (
    <div>
      <p className="mb-2 text-caption font-medium text-tertiary">{label}</p>
      <Picker items={items} />
    </div>
  );
}

/** A row of pill buttons; the selected one reveals its detail card below. */
function Picker({ items }: { items: PickItem[] }) {
  const [selected, setSelected] = useState(items[0].id);
  const active = items.find((i) => i.id === selected) ?? items[0];

  return (
    <div className="rounded-xl border border-border bg-canvas p-4">
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const isActive = item.id === selected;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setSelected(item.id)}
              className={[
                'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-footnote transition-base',
                isActive
                  ? 'border-brand bg-brand/10 font-medium text-brand'
                  : 'border-border bg-surface text-secondary hover:border-brand/50 hover:text-primary',
              ].join(' ')}
            >
              <Icon size={15} />
              {item.label}
            </button>
          );
        })}
      </div>

      <motion.div
        key={active.id}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.16, ease: [0.2, 0, 0, 1] }}
        className="mt-3 rounded-lg bg-surface px-4 py-3 text-body text-secondary"
      >
        <span className="font-medium text-primary">{active.label}</span> — {active.detail}
      </motion.div>
    </div>
  );
}

const TOOLBAR: PickItem[] = [
  {
    id: 'move',
    label: 'Move',
    icon: MousePointer2,
    detail: 'выделять и двигать объекты. Move (V), Hand (H) — рука, Scale (K) — масштабирование.',
  },
  {
    id: 'region',
    label: 'Region',
    icon: Frame,
    detail:
      'контейнеры и области. Frame (F) — экран или блок, Section (Shift+S) — группировка, Slice (S) — область под экспорт.',
  },
  {
    id: 'shape',
    label: 'Shape',
    icon: Square,
    detail: 'базовые фигуры: Rectangle (R), Line (L), Arrow, Ellipse (O), Polygon, Star, Image/video.',
  },
  {
    id: 'create',
    label: 'Create',
    icon: PenTool,
    detail: 'векторы. Pen (P) — точные контуры, Pencil (Shift+P) — свободный набросок от руки.',
  },
  {
    id: 'comment',
    label: 'Comment',
    icon: MessageCircle,
    detail:
      'Comment (C) — комментарий, Annotation — подписать решение, Measurement (M) — замерить размеры и отступы.',
  },
  {
    id: 'ai',
    label: 'AI Tools',
    icon: Sparkles,
    detail: 'ИИ-помощники: переименовать слои, сгенерировать картинку, переписать текст, найти похожее.',
  },
];

const CANVAS_PANELS: PickItem[] = [
  {
    id: 'file',
    label: 'File / Assets',
    icon: Files,
    detail: 'две вкладки слева: сам файл и библиотека ассетов — компоненты и стили для переиспользования.',
  },
  {
    id: 'pages',
    label: 'Pages',
    icon: FileStack,
    detail: 'страницы внутри одного файла — между ними переключаешься, у каждой свой холст.',
  },
  {
    id: 'layers',
    label: 'Layers (слои)',
    icon: Layers,
    detail: 'дерево всех объектов на странице: фреймы, группы, текст, картинки — сверху вниз по порядку.',
  },
  {
    id: 'design',
    label: 'Design / Prototype',
    icon: Play,
    detail: 'переключатель сверху: Design — оформление, Prototype — связи и переходы между экранами.',
  },
  {
    id: 'page-style',
    label: 'Стиль Page',
    icon: Palette,
    detail: 'цвет фона самого холста (canvas) — на чём лежат твои макеты.',
  },
  {
    id: 'props',
    label: 'Свойства',
    icon: SlidersHorizontal,
    detail: 'правая панель: параметры выделенного объекта — размеры, отступы, цвета, типографика.',
  },
  {
    id: 'toolbar',
    label: 'Панель инструментов',
    icon: PencilRuler,
    detail: 'нижняя панель по центру — инструменты создания и работы с объектами (см. следующую секцию).',
  },
];

const MODES: PickItem[] = [
  {
    id: 'draw',
    label: 'Рисование (Draw)',
    icon: Pencil,
    detail: 'свободное рисование поверх макета — быстрые пометки и наброски.',
  },
  {
    id: 'dev',
    label: 'DevMode',
    icon: Code2,
    detail: 'режим для разработки: размеры, токены и готовый код элементов.',
  },
  {
    id: 'ai',
    label: 'AI Tools',
    icon: Sparkles,
    detail: 'для картинок: Crop, Select area, Remove background, Edit with prompt и другое.',
  },
];

const FILE_TYPES: PickItem[] = [
  { id: 'design', label: 'Design', icon: PenTool, detail: 'дизайн-проекты — основные макеты интерфейсов.' },
  { id: 'figjam', label: 'FigJam', icon: PenLine, detail: 'CJM-проекты, схемы и брейнштормы на доске.' },
  { id: 'slides', label: 'Slides', icon: Presentation, detail: 'презентации.' },
  { id: 'buzz', label: 'Buzz', icon: Megaphone, detail: 'промо-посты (без дизайна с нуля).' },
  { id: 'site', label: 'Site', icon: Globe, detail: 'конструктор сайтов.' },
  { id: 'make', label: 'Make', icon: Sparkles, detail: 'нейронка для генерации сайтов.' },
];

const MENU: PickItem[] = [
  { id: 'drafts', label: 'Drafts', icon: FileText, detail: 'черновики — твои быстрые файлы.' },
  { id: 'projects', label: 'All projects', icon: FolderOpen, detail: 'все проекты.' },
  { id: 'resources', label: 'Resources', icon: Package, detail: 'ресурсы — доступно в Pro.' },
  { id: 'trash', label: 'Trash', icon: Trash2, detail: 'корзина.' },
  { id: 'community', label: 'Community', icon: Users, detail: 'работы других пользователей.' },
];
