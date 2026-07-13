import type { Lesson } from '@/lib/curriculum/types';
import { Type, Palette, Bold, Square } from 'lucide-react';

/** UI Foundations — typographic hierarchy (uses the drag-to-order canvas). */
export const typeHierarchy: Lesson = {
  id: 'type-hierarchy',
  slug: 'type-hierarchy',
  title: 'Типографическая иерархия',
  pathTitle: 'UI Foundations',
  skill: 'hierarchy',
  difficulty: 'easy',
  estimatedMinutes: 10,
  objectives: [
    'Понять, как размер, вес и цвет создают иерархию',
    'Научиться выстраивать порядок внимания на экране',
    'Отличать плоскую верстку от ясной иерархии',
  ],
  prerequisites: ['spacing-8pt-grid'],
  theory: [
    'Иерархия говорит глазу, **что читать первым**. Её создают три инструмента: **размер**, **вес** и **цвет** — а не украшения.',
    'Один уровень — один приём. Заголовок крупнее и жирнее; вспомогательный текст мельче и приглушённее. Когда всё одинаковое — иерархии нет, экран «плоский».',
    'Порядок внимания обычно: заголовок → подзаголовок → основной текст → подпись → действие (кнопка выделяется цветом, а не размером).',
  ],
  examples: [
    { kind: 'bad', caption: 'Всё одним размером — иерархии нет', visual: 'hierarchy-bad' },
    { kind: 'good', caption: 'Размер + вес + цвет — ясный порядок', visual: 'hierarchy-good' },
  ],
  exercises: [
    {
      id: 'h-choose-1',
      type: 'choose',
      picker: 'tiles',
      prompt: 'Чем НЕ стоит создавать иерархию в первую очередь?',
      options: [
        { id: 'a', label: 'Размер', icon: Type },
        { id: 'b', label: 'Цвет', icon: Palette },
        { id: 'c', label: 'Вес', icon: Bold },
        { id: 'd', label: 'Рамки', icon: Square },
      ],
      correctOptionId: 'd',
      explanation:
        'Иерархию несут размер, вес и цвет. Рамки и тени — декор: они добавляют шум и редко помогают понять, что важнее.',
    },
    {
      id: 'h-order-1',
      type: 'order',
      prompt: 'Перетащи элементы в правильном порядке иерархии — от главного к второстепенному.',
      items: [
        { id: 'body', label: 'Описание товара и деталей', size: 'body' },
        { id: 'title', label: 'Название товара', size: 'title' },
        { id: 'caption', label: 'Артикул · SKU-2481', size: 'caption' },
        { id: 'subtitle', label: 'Категория: Наушники', size: 'body' },
      ],
      correctOrder: ['title', 'subtitle', 'body', 'caption'],
      explanation:
        'Сначала — название (главное), затем категория как подзаголовок, потом описание, и в самом низу — служебная подпись (артикул). Так глаз движется от важного к деталям.',
    },
  ],
  masteryChallenge: {
    id: 'h-order-2',
    type: 'order',
    prompt: 'Собери иерархию экрана оплаты — от того, что видят первым, к последнему.',
    items: [
      { id: 'hint', label: 'Нажимая «Оплатить», вы принимаете условия', size: 'caption' },
      { id: 'amount', label: '4 990 ₽', size: 'display' },
      { id: 'label', label: 'Сумма к оплате', size: 'body' },
      { id: 'cta', label: 'Оплатить', size: 'button' },
    ],
    correctOrder: ['label', 'amount', 'cta', 'hint'],
    explanation:
      'Подпись «Сумма к оплате» вводит контекст, крупная сумма — фокус экрана, затем кнопка действия, и мелкая юридическая подпись — в самом низу.',
  },
};
