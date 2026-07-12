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
