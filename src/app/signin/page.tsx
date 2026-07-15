import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { SignInForm } from '@/components/auth/SignInForm';

export const dynamic = 'force-dynamic';

/** Staff sign-in. Already signed in → bounce to your home. */
export default async function SignInPage() {
  const user = await getSessionUser();
  if (user) redirect('/admin');

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[420px] flex-col justify-center px-6 py-12">
      <h1 className="text-title1 font-bold text-primary">Вход для преподавателей</h1>
      <p className="mt-1 text-footnote text-secondary">
        Введите email и пароль. Нет аккаунта — попросите пригласительную ссылку у администратора.
      </p>
      <Suspense>
        <SignInForm />
      </Suspense>
    </main>
  );
}
