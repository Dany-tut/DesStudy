import { ShieldAlert } from 'lucide-react';
import { prisma } from '@/lib/db';
import { AssessmentPlayer } from '@/components/assessment/AssessmentPlayer';

export const dynamic = 'force-dynamic';

/**
 * Public test-link landing — a teacher's single-use TEST link. Validate the
 * token, then run the grading test starting from the ФИ step. On finish the
 * card is attributed to the issuing teacher (see /api/assessment). We always
 * open with the name step (initialName=null) so the student introduces
 * themselves regardless of any stray anonymous cookie.
 */
export default async function TestLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const invite = await prisma.learnerInvite.findUnique({ where: { token } });
  const invalid = !invite || invite.kind !== 'TEST' || !!invite.usedAt;
  const expired = !!invite?.expiresAt && invite.expiresAt < new Date();

  if (invalid || expired) {
    return (
      <main className="mx-auto flex min-h-screen max-w-[420px] flex-col justify-center px-6 py-12">
        <div className="flex items-start gap-2 rounded-lg bg-warning/10 px-4 py-3 text-footnote text-warning">
          <ShieldAlert size={16} className="mt-0.5 shrink-0" />
          <span>
            {expired
              ? 'Срок действия ссылки истёк. Попросите преподавателя выдать новую.'
              : 'Ссылка недействительна или уже использована. Попросите новую у преподавателя.'}
          </span>
        </div>
      </main>
    );
  }

  return <AssessmentPlayer initialName={null} inviteToken={token} />;
}
