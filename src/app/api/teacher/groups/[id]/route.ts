import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const runtime = 'nodejs';

/** Delete a group. Only its owner (or the boss) may. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const group = await prisma.group.findUnique({ where: { id } });
  if (!group) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (group.teacherId !== user.id && user.role !== 'BOSS') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  await prisma.group.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
