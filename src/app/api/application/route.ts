import { NextRequest, NextResponse } from 'next/server';
import { getCurrentLearner } from '@/lib/learner';
import { prisma } from '@/lib/db';
import { sendTelegramMessage, botChatLink, escapeHtml } from '@/lib/notify/telegram';
import { randomBytes } from 'node:crypto';

export const runtime = 'nodejs';

/** The three guest tariffs from the pricing screen (PricingPlans). */
const PLANS = ['self', 'mentor', 'job'] as const;
type Plan = (typeof PLANS)[number];

/** Tariff id → the label the learner saw, reused in the Telegram ping. */
const PLAN_LABEL: Record<Plan, string> = {
  self: 'Самостоятельно',
  mentor: 'С ментором',
  job: 'До оффера',
};

/** Grade id (as stored on Assessment) → Russian label for the Telegram ping. */
const GRADE_LABEL: Record<string, string> = {
  junior: 'Junior',
  middle: 'Middle',
  senior: 'Senior',
};

function isPlan(v: unknown): v is Plan {
  return typeof v === 'string' && (PLANS as readonly string[]).includes(v);
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/**
 * A guest "оставить заявку" from the pricing screen. Records which tariff the
 * current learner picked — plus their contact (ФИ + telegram required, phone
 * optional) — so it surfaces as a lead in the teacher/boss results view. One
 * learner keeps a single application: re-submitting updates the plan and
 * re-opens it (status back to 'new') rather than piling up duplicate leads.
 *
 * On success it also pings the curator's Telegram chat so someone reacts fast;
 * the ping is best-effort and never fails the заявка.
 */
export async function POST(req: NextRequest) {
  let body: { plan?: unknown; name?: unknown; phone?: unknown; telegram?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!isPlan(body.plan)) {
    return NextResponse.json({ error: 'invalid_plan' }, { status: 400 });
  }

  const telegram = str(body.telegram);
  if (!telegram) {
    return NextResponse.json({ error: 'telegram_required' }, { status: 400 });
  }
  const name = str(body.name);
  if (!name) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 });
  }
  const phone = str(body.phone); // optional now

  const learner = await getCurrentLearner();
  const plan = body.plan;

  // Deep-link token so the applicant can open a chat with the curator over the
  // bot. Generated once per learner and reused across re-submits.
  const chatToken = learner.tgLinkToken ?? randomBytes(12).toString('base64url');

  await prisma.$transaction(async (tx) => {
    const learnerData: {
      name?: string;
      phone: string | null;
      telegram: string;
      tgLinkToken?: string;
    } = {
      phone: phone || null,
      telegram,
    };
    if (name !== learner.name) learnerData.name = name;
    if (!learner.tgLinkToken) learnerData.tgLinkToken = chatToken;
    await tx.learner.update({ where: { id: learner.id }, data: learnerData });

    const existing = await tx.application.findFirst({
      where: { learnerId: learner.id },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      await tx.application.update({
        where: { id: existing.id },
        data: { plan, status: 'new' },
      });
    } else {
      await tx.application.create({
        data: { learnerId: learner.id, plan },
      });
    }
  });

  // Ping the curator chat — best-effort, after the заявка is safely persisted.
  const latest = await prisma.assessment.findFirst({
    where: { learnerId: learner.id },
    orderBy: { createdAt: 'desc' },
    select: { grade: true },
  });
  const lines = [
    '🎯 <b>Новая заявка на грейд-платформу</b>',
    `Тариф: <b>${escapeHtml(PLAN_LABEL[plan])}</b>`,
    `ФИ: ${escapeHtml(name)}`,
    `Грейд: ${latest ? escapeHtml(GRADE_LABEL[latest.grade] ?? latest.grade) : 'тест не пройден'}`,
    `Telegram: ${escapeHtml(telegram)}`,
  ];
  if (phone) lines.push(`Телефон: ${escapeHtml(phone)}`);
  await sendTelegramMessage(lines.join('\n'));

  // Hand the applicant a deep link so they can open the curator chat right from
  // Telegram; pressing Start there wires up two-way messaging (see the webhook).
  return NextResponse.json({ ok: true, chatLink: botChatLink(chatToken) });
}
