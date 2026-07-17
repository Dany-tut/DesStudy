/**
 * AI screen analysis for the screen-critique authoring flow.
 * ==========================================================
 * A teacher uploads a "broken" screen (PNG/JPG/WebP or PDF) and, optionally, the
 * "good" version. Claude Opus 4.8 (vision) reads the pixels and proposes zones —
 * bounding box, role on the screen, primary defect, short Russian notes, and 2–3
 * candidate fixes (exactly one correct). The teacher then edits and saves; the
 * AI only PROPOSES — the teacher owns the final ground truth.
 *
 * Same conventions as mentor.ts: structured JSON output + graceful offline
 * fallback so authoring never hard-blocks when no ANTHROPIC_API_KEY is set.
 */
import { claudeProxyText } from './claudeProxy';
import type { CritiqueRoleId, CritiqueDefectId } from '@/lib/curriculum/types';
import { CRITIQUE_ROLES, CRITIQUE_DEFECTS } from '@/lib/curriculum/screenCritique';

export type CritiqueImageMediaType =
  | 'image/png'
  | 'image/jpeg'
  | 'image/webp'
  | 'image/gif'
  | 'application/pdf';

export interface AnalyzeInput {
  /** Base64-encoded bytes of the broken screen (no data: prefix). */
  imageBase64: string;
  mediaType: CritiqueImageMediaType;
  /** Optional teacher-provided context (product, what the screen is). */
  screenTitle?: string;
  /** Optional "good" version for comparison. */
  goodBase64?: string;
  goodMediaType?: CritiqueImageMediaType;
}

export interface SuggestedFix {
  label: string;
  correct: boolean;
}
export interface SuggestedZone {
  label: string;
  rect: { x0: number; y0: number; x1: number; y1: number };
  role: CritiqueRoleId;
  defect: CritiqueDefectId;
  roleNote: string;
  intent: string;
  defectNote: string;
  fixes: SuggestedFix[];
}
export interface AnalyzeReply {
  screenTitle: string;
  zones: SuggestedZone[];
  /** true when this came from the fallback, not the live model. */
  offline?: boolean;
}

const ROLE_IDS = CRITIQUE_ROLES.map((r) => r.id);
const DEFECT_IDS = CRITIQUE_DEFECTS.map((d) => d.id);

const SYSTEM = `You are a senior product designer helping a design teacher turn a real screen into a "screen-critique" exercise.

You are shown a UI screen (deliberately imperfect). Identify 4–8 meaningful ZONES a learner should notice. For each zone return:
- label: short Russian name of the zone (e.g. "Шапка с балансом").
- rect: bounding box as PERCENT of the image, 0..100, {x0,y0,x1,y1} top-left → bottom-right. Be reasonably tight.
- role: the zone's role on the screen. One of: ${ROLE_IDS.join(', ')}.
- defect: the single PRIMARY problem in the zone, or "none" if the zone is clean. One of: ${DEFECT_IDS.join(', ')}.
- roleNote: one Russian sentence — why it has that role.
- intent: one Russian sentence — how the zone SHOULD be designed (ground truth used later to judge fixes).
- defectNote: one Russian sentence — what exactly is wrong (empty if defect is "none").
- fixes: for a defective zone, 2–3 candidate fixes as short Russian phrases; mark EXACTLY ONE as correct (the real repair), the rest plausible-but-wrong. For a clean zone (defect "none") return an empty fixes list.

If a second "good" screen is provided, use it to ground what "correct" looks like.

Rules: only real, visible problems — never invent. Cover the hierarchy (what's the accent, what's secondary, what's just chrome). Write all human text in Russian. Return via the structured schema only.`;

const SCHEMA = {
  type: 'object' as const,
  properties: {
    screenTitle: { type: 'string' as const },
    zones: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          label: { type: 'string' as const },
          rect: {
            type: 'object' as const,
            properties: {
              x0: { type: 'number' as const },
              y0: { type: 'number' as const },
              x1: { type: 'number' as const },
              y1: { type: 'number' as const },
            },
            required: ['x0', 'y0', 'x1', 'y1'],
            additionalProperties: false,
          },
          role: { type: 'string' as const, enum: ROLE_IDS },
          defect: { type: 'string' as const, enum: DEFECT_IDS },
          roleNote: { type: 'string' as const },
          intent: { type: 'string' as const },
          defectNote: { type: 'string' as const },
          fixes: {
            type: 'array' as const,
            items: {
              type: 'object' as const,
              properties: {
                label: { type: 'string' as const },
                correct: { type: 'boolean' as const },
              },
              required: ['label', 'correct'],
              additionalProperties: false,
            },
          },
        },
        required: ['label', 'rect', 'role', 'defect', 'roleNote', 'intent', 'defectNote', 'fixes'],
        additionalProperties: false,
      },
    },
  },
  required: ['screenTitle', 'zones'],
  additionalProperties: false,
};

function imageBlock(base64: string, mediaType: CritiqueImageMediaType) {
  if (mediaType === 'application/pdf') {
    return { type: 'document' as const, source: { type: 'base64' as const, media_type: mediaType, data: base64 } };
  }
  return { type: 'image' as const, source: { type: 'base64' as const, media_type: mediaType, data: base64 } };
}

function fallback(input: AnalyzeInput): AnalyzeReply {
  return { screenTitle: input.screenTitle?.trim() || 'Загруженный экран', zones: [], offline: true };
}

/** Clamp/repair the model output into the strict SuggestedZone shape. */
function sanitize(reply: AnalyzeReply): AnalyzeReply {
  const roleSet = new Set(ROLE_IDS);
  const defectSet = new Set(DEFECT_IDS);
  const clampPct = (n: unknown) => Math.max(0, Math.min(100, Number(n) || 0));
  const zones = (reply.zones ?? [])
    .map((z) => {
      const role = (roleSet.has(z.role) ? z.role : 'secondary') as CritiqueRoleId;
      const defect = (defectSet.has(z.defect) ? z.defect : 'none') as CritiqueDefectId;
      let fixes = Array.isArray(z.fixes) ? z.fixes.filter((f) => f && f.label?.trim()) : [];
      // Enforce exactly one correct fix on a defective zone.
      if (defect !== 'none' && fixes.length > 0) {
        const firstCorrect = fixes.findIndex((f) => f.correct);
        const keep = firstCorrect === -1 ? 0 : firstCorrect;
        fixes = fixes.map((f, i) => ({ label: f.label, correct: i === keep }));
      } else {
        fixes = [];
      }
      return {
        label: z.label ?? '',
        rect: {
          x0: clampPct(z.rect?.x0),
          y0: clampPct(z.rect?.y0),
          x1: clampPct(z.rect?.x1),
          y1: clampPct(z.rect?.y1),
        },
        role,
        defect,
        roleNote: z.roleNote ?? '',
        intent: z.intent ?? '',
        defectNote: z.defectNote ?? '',
        fixes,
      };
    })
    .filter((z) => z.label.trim());
  return { screenTitle: reply.screenTitle?.trim() || 'Загруженный экран', zones };
}

export async function analyzeScreen(input: AnalyzeInput): Promise<AnalyzeReply> {
  // Image / document / text blocks, in the Messages-API wire shape. Typed
  // locally rather than via the SDK — see claudeProxy.ts for why the SDK isn't
  // used here at all.
  const content: (
    | ReturnType<typeof imageBlock>
    | { type: 'text'; text: string }
  )[] = [imageBlock(input.imageBase64, input.mediaType)];
  if (input.goodBase64 && input.goodMediaType) {
    content.push({ type: 'text', text: 'Это «хороший» вариант того же экрана — используй его как эталон:' });
    content.push(imageBlock(input.goodBase64, input.goodMediaType));
  }
  content.push({
    type: 'text',
    text: [
      input.screenTitle ? `Контекст экрана: ${input.screenTitle}` : 'Контекст экрана не задан.',
      'Разбери экран на зоны по инструкции и верни структурированный результат.',
    ].join('\n'),
  });

  const text = await claudeProxyText({
    model: 'claude-opus-4-8',
    max_tokens: 4096,
    system: SYSTEM,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    messages: [{ role: 'user', content }],
  });
  if (!text) return fallback(input);

  try {
    return sanitize(JSON.parse(text) as AnalyzeReply);
  } catch {
    return fallback(input);
  }
}
