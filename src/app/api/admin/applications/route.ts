import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { loadApplicationRows } from '@/lib/admin/applications';

export const runtime = 'nodejs';

/**
 * Live list of заявки for the admin «Заявки» inbox. BOSS-only — same gate as the
 * /admin hub. The server page seeds first paint; the client re-fetches this on
 * «Обновить» and on a short poll so new leads + inbound replies surface without a
 * full reload. Shape matches the server page via the shared loader.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== 'BOSS') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const applications = await loadApplicationRows();
  return NextResponse.json({ applications });
}
