import { redirect } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { RegisterForm } from '@/components/auth/RegisterForm';

export const dynamic = 'force-dynamic';

/** Invite landing — validate the token server-side, then show the register form. */
export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Already signed in — no point registering again.
  const user = await getSessionUser();
  if (user) redirect('/admin');

  const invite = await prisma.invite.findUnique({ where: { token } });
  const invalid = !invite || !!invite.usedById;
  const expired = !!invite?.expiresAt && invite.expiresAt < new Date();

  return (
    <main className="mx-auto flex min-h-screen max-w-[420px] flex-col justify-center px-6 py-12">
      {invalid || expired ? (
        <div className="flex items-start gap-2 rounded-lg bg-warning/10 px-4 py-3 text-footnote text-warning">
          <ShieldAlert size={16} className="mt-0.5 shrink-0" />
          <span>
            {expired
              ? 'Срок действия ссылки истёк. Попросите администратора выдать новую.'
              : 'Ссылка недействительна или уже использована. Попросите новую у администратора.'}
          </span>
        </div>
      ) : (
        <>
          <h1 className="text-title1 font-bold text-primary">Регистрация преподавателя</h1>
          <p className="mt-1 text-footnote text-secondary">
            Задайте email и пароль — по ним вы будете входить в кабинет.
          </p>
          <RegisterForm token={token} pinnedEmail={invite!.email} />
        </>
      )}
    </main>
  );
}
