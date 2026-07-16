'use client';

import { useState } from 'react';
import { Copy, Check, Link2, Loader2, Plus } from 'lucide-react';
import { copyText } from '@/lib/clipboard';
import { useT } from '@/lib/i18n/client';

export interface InviteRow {
  id: string;
  token: string;
  email: string | null;
  used: boolean;
  usedByEmail: string | null;
  expiresAt: string | null;
  createdAt: string;
}

function inviteUrl(token: string): string {
  if (typeof window === 'undefined') return `/invite/${token}`;
  return `${window.location.origin}/invite/${token}`;
}

/** BOSS-only: mint single-use teacher invite links and see their status. */
export function InvitesPanel({ initial }: { initial: InviteRow[] }) {
  const { t } = useT();
  const [rows, setRows] = useState<InviteRow[]>(initial);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  async function create() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setRows((r) => [
          {
            id: data.id,
            token: data.token,
            email: email.trim() || null,
            used: false,
            usedByEmail: null,
            expiresAt: null,
            createdAt: new Date().toISOString(),
          },
          ...r,
        ]);
        setEmail('');
        copy(data.token);
      }
    } finally {
      setLoading(false);
    }
  }

  async function copy(token: string) {
    if (await copyText(inviteUrl(token))) {
      setCopied(token);
      setTimeout(() => setCopied((c) => (c === token ? null : c)), 1500);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-elevated p-5">
      <div className="mb-4 flex items-center gap-2">
        <Link2 size={16} className="text-brand" />
        <h2 className="text-callout font-semibold text-primary">{t('admin.inviteTitle')}</h2>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-1 flex-col gap-1.5" style={{ minWidth: 220 }}>
          <span className="text-caption text-tertiary">{t('admin.inviteEmailLabel')}</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teacher@example.com"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-footnote text-primary outline-none transition-fast placeholder:text-tertiary focus:border-brand"
          />
        </label>
        <button
          type="button"
          onClick={create}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-footnote font-medium text-on-brand transition-fast hover:opacity-90 disabled:opacity-50"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
          {t('admin.inviteCreate')}
        </button>
      </div>

      {rows.length > 0 && (
        <ul className="mt-5 flex flex-col gap-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-footnote text-primary">
                  {r.email ?? t('admin.inviteNoEmail')}
                </p>
                <p className="text-caption text-tertiary">
                  {r.used
                    ? t('admin.inviteUsed', { who: r.usedByEmail ?? t('admin.inviteRegistered') })
                    : t('admin.inviteWaiting')}
                </p>
              </div>
              {!r.used && (
                <button
                  type="button"
                  onClick={() => copy(r.token)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-caption font-medium text-secondary transition-fast hover:border-brand/40"
                >
                  {copied === r.token ? (
                    <>
                      <Check size={13} className="text-[#3FB950]" /> {t('admin.inviteCopied')}
                    </>
                  ) : (
                    <>
                      <Copy size={13} /> {t('admin.inviteCopyLink')}
                    </>
                  )}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
