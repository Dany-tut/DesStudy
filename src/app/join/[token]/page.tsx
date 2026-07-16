import { ShieldAlert } from 'lucide-react';
import { prisma } from '@/lib/db';
import { LearnerRegisterForm } from '@/components/auth/LearnerRegisterForm';

export const dynamic = 'force-dynamic';

/**
 * Public LOGIN-link landing — a teacher's single-use link that lets a student
 * set email + password for their existing card (attaching an account to results
 * they already earned). Validate the token, then show the credentials form.
 */
export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const invite = await prisma.learnerInvite.findUnique({
    where: { token },
    include: { learner: true },
  });
  const invalid =
    !invite || invite.kind !== 'LOGIN' || !!invite.usedAt || !invite.learner || !!invite.learner.passwordHash;
  const expired = !!invite?.expiresAt && invite.expiresAt < new Date();

  return (
    <main className="mx-auto flex min-h-screen max-w-[420px] flex-col justify-center px-6 py-12">
      {invalid || expired ? (
        <div className="flex items-start gap-2 rounded-lg bg-warning/10 px-4 py-3 text-footnote text-warning">
          <ShieldAlert size={16} className="mt-0.5 shrink-0" />
          <span>
            {expired
              ? 'Срок действия ссылки истёк. Попросите преподавателя выдать новую.'
              : 'Ссылка недействительна или уже использована. Попросите новую у преподавателя.'}
          </span>
        </div>
      ) : (
        <>
          <h1 className="text-title1 font-bold text-primary">
            {invite!.learner!.name ? `${invite!.learner!.name}, создайте вход` : 'Создайте вход'}
          </h1>
          <p className="mt-1 text-footnote text-secondary">
            {invite!.learner!.name
              ? 'Задайте email и пароль — по ним вы будете входить и видеть свои результаты.'
              : 'Укажите имя, email и пароль — по ним вы будете входить и видеть свои результаты.'}
          </p>
          <LearnerRegisterForm token={token} hasName={!!invite!.learner!.name} />
        </>
      )}
    </main>
  );
}
