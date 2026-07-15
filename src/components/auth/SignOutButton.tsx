'use client';

import { useState } from 'react';
import { LogOut } from 'lucide-react';

export function SignOutButton() {
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    await fetch('/api/auth/signout', { method: 'POST' });
    window.location.href = '/signin';
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-caption font-medium text-secondary transition-fast hover:bg-hover disabled:opacity-50"
    >
      <LogOut size={14} />
      Выйти
    </button>
  );
}
