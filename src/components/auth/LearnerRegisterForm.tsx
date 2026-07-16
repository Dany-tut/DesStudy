'use client';

import { useState } from 'react';
import { Loader2, Eye, EyeOff } from 'lucide-react';

const ERRORS: Record<string, string> = {
  invite_invalid: 'Ссылка недействительна или уже использована.',
  invite_expired: 'Срок действия ссылки истёк.',
  email_taken: 'Этот email уже занят.',
  missing_fields: 'Заполните оба поля, пароль — минимум 8 символов.',
  default: 'Не удалось создать вход. Попробуйте ещё раз.',
};

/** Sets name + email + password for an existing learner card (LOGIN invite). */
export function LearnerRegisterForm({ token, hasName }: { token: string; hasName?: boolean }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError(ERRORS.missing_fields);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/learner-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name: name.trim() || undefined, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(ERRORS[data.error] ?? ERRORS.default);
        return;
      }
      // Full navigation so middleware picks up the new learner session cookie.
      window.location.href = '/student';
    } catch {
      setError(ERRORS.default);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
      {!hasName && (
        <input
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Имя и фамилия"
          className="rounded-lg border border-border bg-surface px-3 py-2.5 text-footnote text-primary outline-none transition-fast placeholder:text-tertiary focus:border-brand"
        />
      )}
      <input
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className="rounded-lg border border-border bg-surface px-3 py-2.5 text-footnote text-primary outline-none transition-fast placeholder:text-tertiary focus:border-brand"
      />
      <label className="flex flex-col gap-1.5">
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Пароль (минимум 8 символов)"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 pr-10 text-footnote text-primary outline-none transition-fast placeholder:text-tertiary focus:border-brand"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
            title={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tertiary transition-fast hover:text-secondary"
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
        Создать вход
      </button>
    </form>
  );
}
