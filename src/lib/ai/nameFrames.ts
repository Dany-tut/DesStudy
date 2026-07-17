/**
 * AI layer naming — «переименовать по смыслу».
 * ============================================
 * An imported screen lands as «Фрейм 41» holding «Вектор 12» × 48 — names that
 * say nothing. This pass gives every layer a name that says what it IS («Экран
 * карты», «Кнопка · Оплатить», «Иконка · галочка»), the way a designer would.
 *
 * It works from a PICTURE of the frame plus each layer's box, not from the text
 * in the tree: these exports routinely convert text to outlines, so the tree
 * carries no readable string at all. The model finds a layer's box in the image
 * and names what's drawn there.
 *
 * One request per frame — each carries its own image. Model: Claude Opus 4.8,
 * via the KIE proxy (see claudeProxy.ts). Degrades to leaving names untouched.
 */
import { claudeProxyText } from './claudeProxy';
import { MAX_LAYERS, type FrameDigest, type LayerRef } from '@/lib/editor/frameDigest';

export type { FrameDigest };

export interface NamedLayer {
  id: string;
  name: string;
}

export interface NameFramesReply {
  layers: NamedLayer[];
  /** true when nothing was renamed — no key, a failed call, an unusable reply. */
  offline?: boolean;
}

const SYSTEM = `Ты — помощник внутри редактора DesStudy: даёшь слоям осмысленные имена, как аккуратный дизайнер в Figma.

Тебе дают КАРТИНКУ одного фрейма и список слоёв внутри него. У каждого слоя: id, текущее имя, тип и коробка (x, y, w, h) — координаты отсчитываются от левого верхнего угла картинки, в тех же единицах, что и её размер.

Как работать: для каждого слоя найди его коробку на картинке, посмотри, что там нарисовано, и назови ЭТО. Текст на экране почти всегда переведён в кривые — читай его глазами с картинки, а не из имён слоёв.

Правила именования:
- Имя отвечает на вопрос «что это», а не «из чего сделано». «Кнопка · Оплатить», «Иконка · галочка», «Карточка кэшбэка», «Ряд действий» — да. «Вектор 12», «Группа 3», «Прямоугольник» — нет.
- Если внутри слоя виден текст — используй его: «Кнопка · Пополнить», «Заголовок · Бонусы по карте».
- Тип слоя — подсказка, а не приговор: text — надпись, vector — иконка или буква в кривых, block — фон/плашка, frame — группа или экран.
- Слой-контейнер называй по его роли на экране («Шапка», «Ряд действий», «Промо-баннер»), а не перечислением содержимого.
- Коротко: 1–4 слова, максимум 40 символов. С заглавной, без точки в конце, без кавычек и эмодзи.
- Если текущее имя явно дал человек (не «Фрейм N», «Вектор N», «Блок N», «Группа N») — СОХРАНИ его без изменений.
- Не выдумывай. Если в коробке ничего осмысленного не разобрать — опиши форму: «Иконка», «Плашка», «Разделитель».
- Сам фрейм назови по экрану целиком: «Экран карты», «Ввод кода из СМС».
- Мелкие декоративные куски одной иконки не выдумывай по-разному: если это части одной галочки, так и назови их.
- Пиши по-русски.
- Верни запись на КАЖДЫЙ присланный id, с тем же id, плюс запись для id самого фрейма.`;

const SCHEMA = {
  type: 'object' as const,
  properties: {
    layers: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          id: { type: 'string' as const },
          name: { type: 'string' as const },
        },
        required: ['id', 'name'],
        additionalProperties: false,
      },
    },
  },
  required: ['layers'],
  additionalProperties: false,
};

/** Names the parser and the frame tool hand out — the ones this pass may replace.
 *  Anything else was typed by a human and is left alone. */
const AUTO_NAME = /^(Фрейм|Группа|Вектор|Блок|Текст|Картинка)(\s+\d+)?$/;

/** Enforce what the schema can't: length, per-id matching, and never touching a
 *  human's name. A model that invents or drops an id would otherwise rename the
 *  wrong layer, so unmatched ids simply keep what they had. */
function sanitize(
  reply: NameFramesReply,
  digest: FrameDigest,
): NameFramesReply {
  const byId = new Map(reply.layers?.map((l) => [l.id, l.name]) ?? []);
  const out: NamedLayer[] = [];

  const take = (id: string, current: string) => {
    if (!AUTO_NAME.test(current.trim())) return; // human-authored → untouched
    const name = (byId.get(id) ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
    if (!name || name === current) return;
    out.push({ id, name });
  };

  take(digest.id, digest.name);
  for (const l of digest.layers) take(l.id, l.name);
  return { layers: out };
}

/** Compact the layer list for the prompt — bare arrays instead of objects, so a
 *  180-layer frame doesn't spend most of its tokens on repeated JSON keys. */
function layerLines(layers: LayerRef[]): string {
  return layers
    .map((l) => {
      const b = l.box ? `${l.box.x},${l.box.y},${l.box.w},${l.box.h}` : '?';
      const t = l.text ? ` текст="${l.text}"` : '';
      return `${l.id}\t${l.type}\td${l.depth}\t[${b}]\t${l.name}${t}`;
    })
    .join('\n');
}

/** Name a frame and everything inside it. Never throws — on any failure it
 *  returns an empty rename list, so the tree is simply left as it was. */
export async function nameFrames(digest: FrameDigest): Promise<NameFramesReply> {
  if (!digest.layers.length && !digest.imageBase64) return { layers: [], offline: true };

  const content: unknown[] = [];
  if (digest.imageBase64) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: 'image/png', data: digest.imageBase64 },
    });
  }
  content.push({
    type: 'text',
    text: [
      `Фрейм ${digest.id}: ${digest.width}×${digest.height}, текущее имя «${digest.name}».`,
      digest.imageBase64
        ? 'Картинка выше — это он. Координаты слоёв отсчитывай от её левого верхнего угла.'
        : 'Картинки нет — называй по структуре, ничего не выдумывая.',
      digest.layers.length >= MAX_LAYERS
        ? `Список обрезан до ${MAX_LAYERS} слоёв — назови те, что есть.`
        : '',
      '',
      'Слои (id / тип / глубина / [x,y,w,h] / текущее имя):',
      layerLines(digest.layers),
    ]
      .filter(Boolean)
      .join('\n'),
  });

  const text = await claudeProxyText({
    model: 'claude-opus-4-8',
    max_tokens: 8192,
    system: SYSTEM,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    messages: [{ role: 'user', content }],
  });
  if (!text) return { layers: [], offline: true };

  try {
    return sanitize(JSON.parse(text) as NameFramesReply, digest);
  } catch {
    return { layers: [], offline: true };
  }
}
