import { NextRequest, NextResponse } from 'next/server';
import { getCurrentLearner } from '@/lib/learner';
import { prisma } from '@/lib/db';
import { sendTelegramMessage, escapeHtml } from '@/lib/notify/telegram';

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
 * current learner picked — plus their contact (phone required, telegram
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

  const phone = str(body.phone);
  if (!phone) {
    return NextResponse.json({ error: 'phone_required' }, { status: 400 });
  }
  const telegram = str(body.telegram);

  const learner = await getCurrentLearner();
  const name = str(body.name);
  const plan = body.plan;

  await prisma.$transaction(async (tx) => {
    const learnerData: { name?: string; phone: string; telegram: string | null } = {
      phone,
      telegram: telegram || null,
    };
    if (name && name !== learner.name) learnerData.name = name;
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
  const displayName = name || learner.name || 'Без имени';
  const lines = [
    '🎯 <b>Новая заявка на грейд-платформу</b>',
    `Тариф: <b>${escapeHtml(PLAN_LABEL[plan])}</b>`,
    `ФИ: ${escapeHtml(displayName)}`,
    `Грейд: ${latest ? escapeHtml(GRADE_LABEL[latest.grade] ?? latest.grade) : 'тест не пройден'}`,
    `Телефон: ${escapeHtml(phone)}`,
  ];
  if (telegram) lines.push(`Telegram: ${escapeHtml(telegram)}`);
  await sendTelegramMessage(lines.join('\n'));

  return NextResponse.json({ ok: true });
}
