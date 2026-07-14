import type { Lesson } from '@/lib/curriculum/types';

/**
 * Вводная лекция про сам инструмент. Идёт сразу после «design-thinking-intro»:
 * там — как думать, здесь — знакомимся с Figma, чтобы начать в ней мыслить, а не
 * заучивать её целиком. Пока чисто теория (слайд-секции), без упражнений.
 */
export const figmaIntro: Lesson = {
  id: 'figma-intro',
  slug: 'figma-intro',
  title: 'Знакомимся с Figma — начинаем в ней мыслить',
  pathTitle: 'UI Foundations',
  skill: 'figma-basics',
  kind: 'lecture',
  difficulty: 'intro',
  estimatedMinutes: 8,
  objectives: [
    'Понять логику интерфейса Figma, а не заучивать все кнопки',
    'Разобраться, что такое Canvas, Page, Frame и слои',
    'Узнать основные инструменты и режимы работы',
  ],
  prerequisites: ['design-thinking-intro'],
  theory: [],
  sections: [
    {
      heading: 'Не 10 часов теории, а сразу в инструмент',
      body: [
        'Мы не будем сначала 10 часов говорить о дизайне, а потом когда-нибудь открывать инструмент. Пойдём короткими шагами прямо в Figma.',
        'Сейчас задача — **не выучить Figma целиком**. Задача — **начать в ней мыслить**.',
      ],
      chips: [
        'Скачиваем',
        'Создаём файл',
        'Canvas',
        'Page',
        'Frame',
        'Frame vs Group',
        'Вставка текста',
        'Shape',
        'Перемещение объектов',
        'Слои',
        'Зум',
        'Порядок',
        'Share',
        'Превью',
        'Прототип',
      ],
    },
    {
      heading: 'Интерфейс: с чего начинается файл',
      body: [
        'Слева — навигация по твоему пространству: **Drafts** (черновики), **All projects** (все проекты), **Resources** (доступно в Pro), **Trash** (корзина). Раздел **Community** — работы других пользователей.',
        'Сверху справа — кнопка **создать файл**, а в меню профиля — смена темы и настройки.',
      ],
      chips: [
        'Design — дизайн-проекты',
        'FigJam — CJM-проекты',
        'Slides — презентации',
        'Buzz — промо-посты',
        'Site — конструктор сайтов',
        'Make — генерация сайтов ИИ',
      ],
    },
    {
      heading: 'Page и Canvas — среда, где ты работаешь',
      body: [
        'Canvas — это просто среда, где ты работаешь: на нём можно свободно раскладывать объекты, секции, фреймы и другие элементы.',
        'Слева живут **Pages** и **Layers** (слои), сверху переключается **Design / Prototype**, справа — свойства выделенного объекта и стиль самой страницы.',
      ],
      chips: [
        'File / Assets',
        'Pages',
        'Layers (слои)',
        'Design / Prototype',
        'Свойства',
        'Панель инструментов',
      ],
    },
    {
      heading: 'Панель инструментов: шесть групп',
      body: [
        '**Move** — выделять и двигать объекты (Move V, Hand H, Scale K).',
        '**Region** — контейнеры и области: Frame (F), Section (Shift+S), Slice (S).',
        '**Shape** — базовые фигуры: Rectangle (R), Line (L), Arrow, Ellipse (O), Polygon, Star, Image/video.',
        '**Create** — векторы: Pen (P) для точных контуров, Pencil (Shift+P) для свободного наброска.',
        '**Comment** — Comment (C), Annotation, Measurement (замерить размеры и отступы).',
        '**AI Tools** — переименовать слои, сгенерировать картинку, переписать текст и другое.',
      ],
    },
    {
      heading: 'Есть и другие режимы',
      body: [
        '**Рисование (Draw)** — режим свободного рисования поверх макета.',
        '**DevMode** — режим для разработки: посмотреть размеры, токены и код элементов.',
        '**AI Tools** для картинок — Crop, Select area, Remove background, Edit with prompt и другие.',
      ],
      chips: ['Draw', 'DevMode', 'AI Tools'],
    },
  ],
  examples: [],
  exercises: [],
};
