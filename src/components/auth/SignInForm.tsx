'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Eye, EyeOff } from 'lucide-react';

const ERRORS: Record<string, string> = {
  invalid_credentials: 'Неверный email или пароль.',
  missing_fields: 'Заполните оба поля.',
  default: 'Не удалось войти. Попробуйте ещё раз.',
};

export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(ERRORS[data.error] ?? ERRORS.default);
        return;
      }
      // Full navigation so middleware re-reads the fresh cookie.
      window.location.href = next || '/admin';
    } catch {
      setError(ERRORS.default);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-caption text-tertiary">Email</span>
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2.5 text-footnote text-primary outline-none transition-fast placeholder:text-tertiary focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-caption text-tertiary">Пароль</span>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 pr-10 text-footnote text-primary outline-none transition-fast placeholder:text-tertiary focus:border-brand"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-tertiary transition-fast hover:text-primary"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </label>

      {error && <p className="text-caption text-[#F85149]">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-footnote font-medium text-on-brand transition-fast hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading && <Loader2 size={15} className="animate-spin" />}
        Войти
      </button>
    </form>
  );
}
