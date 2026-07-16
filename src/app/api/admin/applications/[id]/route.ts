import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * Move a lead (Application) between pipeline stages from the admin «Заявки» tab.
 * BOSS-only — same gate as the /admin hub. The заявка is created by the guest
 * flow (api/application); this is the only place its status is mutated after.
 *
 * Statuses: 'new' (Новая) → 'contacted' (Связались) → 'closed' (Готово), plus
 * 'spam' (Спам) as a terminal side-bucket.
 */
const STATUSES = ['new', 'contacted', 'closed', 'spam'] as const;
type Status = (typeof STATUSES)[number];
function isStatus(v: unknown): v is Status {
  return typeof v === 'string' && (STATUSES as readonly string[]).includes(v);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== 'BOSS') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id } = await params;

  let body: { status?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  if (!isStatus(body.status)) {
    return NextResponse.json({ error: 'invalid_status' }, { status: 400 });
  }

  try {
    const updated = await prisma.application.update({
      where: { id },
      data: { status: body.status },
      select: { status: true },
    });
    return NextResponse.json({ ok: true, status: updated.status });
  } catch {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
}
