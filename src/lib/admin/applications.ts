import { prisma } from '@/lib/db';

/**
 * Serialised shape of one заявка row for the admin «Заявки» inbox. Shared by the
 * server page (first paint) and the GET list route (live «Обновить» + polling)
 * so both always agree on the fields the client renders.
 */
export interface ApplicationRowData {
  id: string;
  name: string | null;
  telegram: string | null;
  phone: string | null;
  email: string | null;
  plan: string;
  status: string;
  grade: string | null;
  /** Where the lead can be reached — drives the source badge + primary contact. */
  source: 'telegram' | 'email' | 'phone' | 'none';
  /** Applicant pressed Start on the bot → two-way chat is live (green dot). */
  connected: boolean;
  /** Newest message either way, for the card preview line. */
  lastMessage: { text: string; direction: string; createdAt: string } | null;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

/** Load every заявка, newest first, enriched for the inbox UI. */
export async function loadApplicationRows(): Promise<ApplicationRowData[]> {
  const applications = await prisma.application.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      learner: {
        select: {
          name: true,
          telegram: true,
          phone: true,
          email: true,
          tgChatId: true,
          assessments: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { grade: true },
          },
          chatMessages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { text: true, direction: true, createdAt: true },
          },
        },
      },
    },
  });

  return applications.map((a) => {
    const l = a.learner;
    const source: ApplicationRowData['source'] = l.telegram
      ? 'telegram'
      : l.email
        ? 'email'
        : l.phone
          ? 'phone'
          : 'none';
    const last = l.chatMessages[0];
    return {
      id: a.id,
      name: l.name,
      telegram: l.telegram,
      phone: l.phone,
      email: l.email,
      plan: a.plan,
      status: a.status,
      grade: l.assessments[0]?.grade ?? null,
      source,
      connected: !!l.tgChatId,
      lastMessage: last
        ? { text: last.text, direction: last.direction, createdAt: last.createdAt.toISOString() }
        : null,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    };
  });
}
