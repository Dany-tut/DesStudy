/**
 * AI Mentor — coaching layer.
 * ===========================
 * PRD §3.5: the AI mentor coaches, explains, and challenges — it NEVER solves
 * the exercise for the student. Correctness is decided upstream by the
 * deterministic validator (src/lib/curriculum/validate.ts); the mentor only
 * explains the validator's verdict in a personalized, encouraging way.
 *
 * Model: Claude Opus 4.8. Structured output guarantees a parseable shape.
 * Degrades gracefully to the validator's static explanation when no API key
 * is configured, so the whole flow works offline during development.
 */
import Anthropic from '@anthropic-ai/sdk';
import type { Locale } from '@/lib/i18n/config';

export interface MentorInput {
  lessonTitle: string;
  prompt: string;
  correct: boolean;
  attempts: number;
  /** The learner's chosen answer, as a label. */
  answer: string;
  /** Deterministic explanation from the validator (ground truth). */
  validatorExplanation: string;
  /** Optional targeted hint from the validator for a wrong answer. */
  hint?: string;
}

export interface MentorReply {
  /** One-line personalized read on what happened. */
  diagnosis: string;
  /** The underlying concept to internalize (never the literal answer). */
  concept: string;
  /** A short motivating nudge toward the next attempt / next lesson. */
  encouragement: string;
  /** true when this came from the fallback, not the live model. */
  offline?: boolean;
}

const SYSTEM = `You are the AI Mentor inside DesStudy, a platform where people learn UI/UX design by doing.

Your role (PRD §3.5): COACH, never solve. You are given the exercise, the learner's answer, whether it was correct (already decided by a deterministic validator — you must not second-guess it), and the validator's factual explanation.

Rules:
- Never reveal or restate the literal correct answer for a wrong attempt. Guide them to see it themselves.
- Ground everything in the validator's explanation — never invent design rules.
- Be warm, concise, and specific to THIS answer. No filler, no preamble.
- Match the platform voice: calm, professional, encouraging. Never childish.
- Write in the same language as the exercise prompt (Russian here).
- When the learner is correct, reinforce the underlying principle so it sticks.`;

const SCHEMA = {
  type: 'object' as const,
  properties: {
    diagnosis: { type: 'string' as const },
    concept: { type: 'string' as const },
    encouragement: { type: 'string' as const },
  },
  required: ['diagnosis', 'concept', 'encouragement'],
  additionalProperties: false,
};

/** Deterministic fallback so the feature works without an API key. */
function fallback(input: MentorInput): MentorReply {
  return {
    diagnosis: input.correct
      ? `Верно с ${input.attempts}-й попытки — ты правильно применил правило.`
      : input.hint ?? 'Не совсем — посмотри, какое значение ложится на сетку.',
    concept: input.validatorExplanation,
    encouragement: input.correct
      ? 'Двигаемся дальше — следующий шаг закрепит навык.'
      : 'Попробуй ещё раз, держа правило в голове. Ты близко.',
    offline: true,
  };
}

// ─────────────────────────────────────────────────────────────
// OBSERVATION COACHING — the "what do you see?" layer of a screen
// walkthrough. There is no right/wrong answer: the learner describes a
// screen in their own words and the mentor reflects back what they caught
// and gently points to what they overlooked, before the breakdown is
// revealed. This trains active observation, not recall.
// ─────────────────────────────────────────────────────────────

/** A thing a strong observation of the screen would notice. */
export interface ObserveConcept {
  id: string;
  /** Human label of the concept (sent to the model as ground truth). */
  label: string;
  /** Keywords the offline fallback matches against the learner's text. */
  keywords: string[];
}

export interface ObserveInput {
  screenTitle: string;
  concepts: ObserveConcept[];
  /** The learner's free-text description of what they see. */
  observation: string;
}

export interface ObserveReply {
  /** Warm reflection of what the learner correctly noticed. */
  caught: string;
  /** A gentle pointer to something overlooked — guiding, not scolding. */
  missed: string;
  /** One-line nudge to look again or move on to the breakdown. */
  nudge: string;
  offline?: boolean;
}

const OBSERVE_SYSTEM = `You are the AI Mentor inside DesStudy, coaching a learner through the "what do you see?" step of analysing a UI screen.

There is NO correct answer here — the learner is describing a real screen in their own words, before any breakdown. Your job is to sharpen their eye.

You are given the screen, a list of things a strong observation would notice, and the learner's description.

Rules:
- First, warmly reflect what they genuinely caught — be specific, quote their wording where it helps.
- Then point to ONE, at most two, important things they overlooked — as an invitation to look again, never as a scold, and never a full lecture.
- Do not dump the whole list. Do not explain the design rationale yet — that is the next layers' job.
- Be concise, calm, professional, encouraging. Never childish. No preamble.
- Write in Russian.`;

const OBSERVE_SCHEMA = {
  type: 'object' as const,
  properties: {
    caught: { type: 'string' as const },
    missed: { type: 'string' as const },
    nudge: { type: 'string' as const },
  },
  required: ['caught', 'missed', 'nudge'],
  additionalProperties: false,
};

/** Offline fallback: keyword-match the observation against the concepts. */
function observeFallback(input: ObserveInput): ObserveReply {
  const text = input.observation.toLowerCase();
  const hit = (c: ObserveConcept) => c.keywords.some((k) => text.includes(k.toLowerCase()));
  const caught = input.concepts.filter(hit);
  const missed = input.concepts.filter((c) => !hit(c));

  return {
    caught: caught.length
      ? `Ты заметил: ${caught.map((c) => c.label).join(', ')}. Хороший старт — взгляд цепляет главное.`
      : 'Опиши конкретнее: что за продукт, что здесь крупнее всего, куда падает взгляд первым?',
    missed: missed.length
      ? `Присмотрись ещё: ${missed
          .slice(0, 2)
          .map((c) => c.label)
          .join(', ')} — это тоже часть картины.`
      : 'Ты назвал всё ключевое — глаз уже цепкий.',
    nudge:
      missed.length > 2
        ? 'Пробегись по экрану сверху вниз ещё раз, потом открывай разбор.'
        : 'Готов — переходи к следующему слою и сверься с разбором.',
    offline: true,
  };
}

export async function coachObservation(input: ObserveInput): Promise<ObserveReply> {
  if (!process.env.ANTHROPIC_API_KEY) return observeFallback(input);

  const client = new Anthropic();

  const userPrompt = [
    `Экран: ${input.screenTitle}`,
    `Что замечает сильное наблюдение: ${input.concepts.map((c) => c.label).join('; ')}`,
    '',
    `Описание студента: ${input.observation}`,
    '',
    'Отрази, что он уловил, и мягко укажи на 1–2 упущенных момента. Разбор не раскрывай.',
  ].join('\n');

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      system: OBSERVE_SYSTEM,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: OBSERVE_SCHEMA } },
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = response.content.find((b) => b.type === 'text');
    if (text && text.type === 'text') {
      return { ...(JSON.parse(text.text) as Omit<ObserveReply, 'offline'>) };
    }
    return observeFallback(input);
  } catch {
    return observeFallback(input);
  }
}

// ── Fix critique ────────────────────────────────────────────────────────────
// Judges a learner's free-text "what I'd change here" against the region's
// actual design intent. Design is subjective, so the verdict is 3-state and
// maps to the same green/yellow/red the UI already uses for role tagging.

export interface FixInput {
  screenTitle: string;
  /** Human title of the region the fix targets, e.g. "Промо-вклад". */
  region: string;
  /** Why the region is designed the way it is — ground truth for the mentor. */
  intent: string;
  /** The learner's proposed change, free text. */
  fix: string;
}

export interface FixReply {
  /** improves → green, subjective → yellow, breaks → red. */
  verdict: 'improves' | 'subjective' | 'breaks';
  /** One short mentor line explaining the verdict. */
  comment: string;
  offline?: boolean;
}

const FIX_SYSTEM = `You are the AI Mentor inside DesStudy, judging a learner's proposed change to one region of a UI screen.

Design is subjective — there is rarely one right answer. You are given the region, its actual design intent (ground truth), and the learner's proposed fix.

Classify the fix into exactly one verdict:
- "improves": the change genuinely sharpens the design or fixes a real weakness.
- "subjective": a defensible matter of taste — neither clearly better nor worse; it wouldn't break anything.
- "breaks": the change would harm hierarchy, consistency, or usability, or misreads the intent.

Then write ONE short comment (max ~2 sentences) explaining the verdict — warm, specific, professional, never scolding, never a lecture. If the fix is empty or vague, lean "subjective" and ask for a concrete change.

Write in Russian. No preamble.`;

const FIX_SCHEMA = {
  type: 'object' as const,
  properties: {
    verdict: { type: 'string' as const, enum: ['improves', 'subjective', 'breaks'] },
    comment: { type: 'string' as const },
  },
  required: ['verdict', 'comment'],
  additionalProperties: false,
};

function fixFallback(): FixReply {
  return {
    verdict: 'subjective',
    comment:
      'Ментор офлайн — формулировку правки не проверить. Сверься с разбором роли и реши сам, улучшает ли она экран.',
    offline: true,
  };
}

export async function coachFix(input: FixInput): Promise<FixReply> {
  if (!process.env.ANTHROPIC_API_KEY) return fixFallback();

  const client = new Anthropic();

  const userPrompt = [
    `Экран: ${input.screenTitle}`,
    `Зона: ${input.region}`,
    `Замысел зоны (истина): ${input.intent}`,
    '',
    `Правка студента: ${input.fix}`,
    '',
    'Оцени правку: улучшает / дело вкуса / сломала бы — и коротко объясни.',
  ].join('\n');

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      system: FIX_SYSTEM,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: FIX_SCHEMA } },
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = response.content.find((b) => b.type === 'text');
    if (text && text.type === 'text') {
      return { ...(JSON.parse(text.text) as Omit<FixReply, 'offline'>) };
    }
    return fixFallback();
  } catch {
    return fixFallback();
  }
}

// ── Landing chat coach ───────────────────────────────────────────────────────
// The mentor chat on the marketing landing: a visitor types a free-form question
// about design and gets a short *coaching* reply. Uses a light, fast model
// (Haiku 4.5) — this is a teaser, not the full lesson mentor. Falls back to a
// canned guiding question when no API key is set, so the demo never breaks.

const CHAT_SYSTEM = `Ты — AI-ментор платформы DesStudy, где учатся UI/UX-дизайну на практике.

Твоя роль: КОУЧ. Ты реально помогаешь — объясняешь принцип и даёшь конкретное направление, но не делаешь работу за человека.

Правила:
- Дай по существу вопроса пользу СРАЗУ: назови принцип, приём или ориентир, который двигает человека вперёд. Можно привести конкретные значения/примеры как ориентир (напр. шкала отступов 4/8/16). Не отвечай одним лишь встречным вопросом.
- Единственное, что ты НЕ делаешь, — не выполняешь за человека конкретное задание из урока целиком (не «вот финальный ответ, копируй»). Во всём остальном будь максимально полезным.
- Если вопрос слишком общий и без деталей на него не ответить — дай короткий полезный ориентир И одним вопросом уточни контекст. Не начинай ответ с вопроса.
- Будь конкретным, тёплым и лаконичным: 2–4 коротких предложения, без воды и преамбулы.
- Это чат: пиши обычным текстом сплошными предложениями. Без markdown — никаких звёздочек, **жирного**, заголовков, нумерованных и маркированных списков.
- Голос платформы: спокойный, профессиональный, ободряющий. Не сюсюкай.
- Если вопрос не про дизайн — мягко верни к теме дизайна/интерфейсов.
- Отвечай на русском.`;

// English twin of the coach system prompt — same role and rules, so an EN
// visitor gets an English reply. Only the language of the answer changes.
const CHAT_SYSTEM_EN = `You are the AI mentor of DesStudy, a platform where people learn UI/UX design by doing.

Your role: COACH. You genuinely help — you explain the principle and give a concrete direction, but you don't do the work for the person.

Rules:
- Deliver value on the question RIGHT AWAY: name the principle, technique or benchmark that moves the person forward. You may give concrete values/examples as a reference (e.g. a 4/8/16 spacing scale). Don't answer with only a counter-question.
- The one thing you DON'T do is complete a specific lesson task in full for them (no "here's the final answer, copy it"). In everything else, be as helpful as possible.
- If the question is too general to answer without details — give a short useful pointer AND ask one question to clarify context. Don't start the reply with a question.
- Be concrete, warm and concise: 2–4 short sentences, no fluff or preamble.
- This is a chat: write plain prose in continuous sentences. No markdown — no asterisks, **bold**, headings, numbered or bulleted lists.
- Platform voice: calm, professional, encouraging. Don't be saccharine.
- If the question isn't about design — gently steer back to design/interfaces.
- Answer in English.`;

/** Offline fallback — a generic guiding question (never solves it for them). */
function chatFallback(locale: Locale = 'ru'): { reply: string; offline: true } {
  return {
    reply:
      locale === 'en'
        ? 'Good question. Before I nudge you — what have you already tried, and which part of the result bothers you most? Let’s start there.'
        : 'Хороший вопрос. Прежде чем подсказать — что ты уже пробовал и какой результат смущает сильнее всего? Давай начнём оттуда.',
    offline: true,
  };
}

export async function coachChat(
  message: string,
  history: { role: 'user' | 'assistant'; content: string }[] = [],
  locale: Locale = 'ru',
): Promise<{ reply: string; offline?: boolean }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return chatFallback(locale);

  // We call the proxy with a plain fetch rather than the SDK, for two reasons:
  //  1. Auth — the proxy expects `Authorization: Bearer`, not Anthropic's
  //     `x-api-key` (which returns a wrapped 401).
  //  2. WAF — the proxy 403s ("request was blocked") on the SDK's telemetry
  //     headers/User-Agent. A minimal fetch with only the required headers gets
  //     through cleanly.
  // Base URL from a dedicated var (default: the proxy) so a global
  // ANTHROPIC_BASE_URL pointing at api.anthropic.com can't shadow it.
  const base = process.env.MENTOR_BASE_URL || 'https://api.kie.ai/claude';

  try {
    const res = await fetch(`${base}/v1/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: CHAT_SYSTEM,
        messages: [...history.slice(-6), { role: 'user', content: message }],
      }),
    });

    const data = (await res.json()) as {
      content?: { type: string; text?: string }[];
    };
    const text = data.content?.find((b) => b.type === 'text');
    if (text?.text?.trim()) return { reply: text.text.trim() };
    return chatFallback();
  } catch {
    return chatFallback();
  }
}

export async function coach(input: MentorInput): Promise<MentorReply> {
  if (!process.env.ANTHROPIC_API_KEY) return fallback(input);

  const client = new Anthropic();

  const userPrompt = [
    `Урок: ${input.lessonTitle}`,
    `Задание: ${input.prompt}`,
    `Ответ студента: ${input.answer}`,
    `Результат валидатора: ${input.correct ? 'ВЕРНО' : 'НЕВЕРНО'} (попытка №${input.attempts})`,
    input.hint ? `Подсказка валидатора: ${input.hint}` : '',
    `Объяснение валидатора (истина): ${input.validatorExplanation}`,
    '',
    input.correct
      ? 'Закрепи принцип, стоящий за верным ответом.'
      : 'Помоги понять ошибку, НЕ называя правильный ответ.',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      system: SYSTEM,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = response.content.find((b) => b.type === 'text');
    if (text && text.type === 'text') {
      return { ...(JSON.parse(text.text) as Omit<MentorReply, 'offline'>) };
    }
    return fallback(input);
  } catch {
    // Network / auth / parse failure → never block the learner.
    return fallback(input);
  }
}
