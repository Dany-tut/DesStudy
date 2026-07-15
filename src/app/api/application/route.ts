import { NextRequest, NextResponse } from 'next/server';
import { getCurrentLearner } from '@/lib/learner';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

/** The three guest tariffs from the pricing screen (PricingPlans). */
const PLANS = ['self', 'mentor', 'job'] as const;
type Plan = (typeof PLANS)[number];

function isPlan(v: unknown): v is Plan {
  return typeof v === 'string' && (PLANS as readonly string[]).includes(v);
}

/**
 * A guest "оставить заявку" from the pricing screen. Records which tariff the
 * current learner picked so it surfaces as a lead in the teacher/boss results
 * view. One learner keeps a single application — re-submitting updates the plan
 * and re-opens it (status back to 'new'), rather than piling up duplicate leads.
 */
export async function POST(req: NextRequest) {
  let body: { plan?: unknown; name?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!isPlan(body.plan)) {
    return NextResponse.json({ error: 'invalid_plan' }, { status: 400 });
  }

  const learner = await getCurrentLearner();
  const name = typeof body.name === 'string' ? body.name.trim() : '';

  await prisma.$transaction(async (tx) => {
    if (name && name !== learner.name) {
      await tx.learner.update({ where: { id: learner.id }, data: { name } });
    }

    const existing = await tx.application.findFirst({
      where: { learnerId: learner.id },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      await tx.application.update({
        where: { id: existing.id },
        data: { plan: body.plan as Plan, status: 'new' },
      });
    } else {
      await tx.application.create({
        data: { learnerId: learner.id, plan: body.plan as Plan },
      });
    }
  });

  return NextResponse.json({ ok: true });
}
