'use client';

import Link from 'next/link';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LogOut, Settings, User, Sun, Moon } from 'lucide-react';
import { useI18n } from '@/lib/i18n/client';
import { LOCALES, LOCALE_NAMES } from '@/lib/i18n/config';
import { loadSettings, saveSettings, applySettings, type ThemePref } from '@/lib/settings';

export interface UserMenuUser {
  /** Display name (or email fallback). */
  name: string;
  /** Secondary line — role label for staff, email/"Ученик" for learners. */
  subtitle?: string;
}

/** First letters of the first two words — "Иван Петров" → "ИП". */
function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const chars = parts.slice(0, 2).map((p) => p[0]!.toUpperCase());
  return chars.join('');
}

/**
 * Avatar button + dropdown shared by both shells (TopHeader for staff/guests,
 * Sidebar for registered learners). Replaces the old bare name text + logout
 * button: identity, inline theme switch, links to profile/settings, and the
 * single sign-out that clears both session cookies.
 *
 * `align` controls which edge the panel hugs — the header opens it to the left
 * (bottom-right anchor), the sidebar opens it to the right (bottom-left anchor).
 */
export function UserMenu({
  user,
  align = 'end',
  openUp = false,
  full = false,
}: {
  user: UserMenuUser;
  align?: 'start' | 'end';
  /** Open the panel above the trigger (for bottom-anchored placements). */
  openUp?: boolean;
  /** Stretch the trigger to fill its container (sidebar footer). */
  full?: boolean;
}) {
  const { t, locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<ThemePref>('light');
  const [busy, setBusy] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setTheme(loadSettings().theme), []);

  // Position the (portaled) panel relative to the trigger. Portaling to
  // document.body lets the menu escape ancestor `overflow-hidden`/stacking
  // contexts (e.g. the editor's full-bleed workspace) so it never gets clipped.
  const PANEL_W = 256; // w-[16rem]
  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      const gap = 6;
      const ph = panelRef.current?.offsetHeight ?? 0;
      const top = openUp ? r.top - gap - ph : r.bottom - gap;
      const left = align === 'end' ? r.right - PANEL_W : r.left;
      // Keep the panel within the viewport horizontally.
      const clampedLeft = Math.max(8, Math.min(left, window.innerWidth - PANEL_W - 8));
      setCoords({ top, left: clampedLeft });
    }
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, align, openUp]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function pickTheme(next: ThemePref) {
    setTheme(next);
    const merged = { ...loadSettings(), theme: next };
    applySettings(merged);
    saveSettings(merged);
  }

  async function signOut() {
    setBusy(true);
    await fetch('/api/auth/signout', { method: 'POST' });
    window.location.href = '/signin';
  }

  return (
    <div ref={rootRef} className={`relative ${full ? 'w-full' : 'shrink-0'}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex items-center gap-2.5 rounded-full p-0.5 pr-4 transition-base hover:bg-hover ${
          full ? 'w-full rounded-xl' : ''
        }`}
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-caption font-bold text-on-brand"
          aria-hidden
        >
          {initials(user.name)}
        </span>
        <span
          className={`truncate text-footnote font-semibold text-primary ${
            full ? 'flex-1 text-left' : 'hidden max-w-[9rem] sm:block'
          }`}
        >
          {user.name}
        </span>
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          role="menu"
          style={{ position: 'fixed', top: coords?.top ?? -9999, left: coords?.left ?? -9999 }}
          className="z-[60] w-[16rem] overflow-hidden rounded-2xl border border-border bg-surface p-1.5 shadow-xl"
        >
          <div className="flex items-center gap-3 px-2.5 py-2">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-footnote font-bold text-on-brand"
              aria-hidden
            >
              {initials(user.name)}
            </span>
            <div className="min-w-0">
              <div className="truncate text-footnote font-semibold text-primary">{user.name}</div>
              {user.subtitle && (
                <div className="truncate text-caption text-tertiary">{user.subtitle}</div>
              )}
            </div>
          </div>

          <div className="my-1.5 flex items-center gap-1 rounded-xl bg-muted p-1">
            <ThemeChip
              active={theme === 'light'}
              onClick={() => pickTheme('light')}
              icon={<Sun size={15} />}
              label={t('settings.themeLight')}
            />
            <ThemeChip
              active={theme === 'dark'}
              onClick={() => pickTheme('dark')}
              icon={<Moon size={15} />}
              label={t('settings.themeDark')}
            />
          </div>

          <div className="mb-1.5 flex items-center gap-1 rounded-xl bg-muted p-1">
            {LOCALES.map((loc) => (
              <ThemeChip
                key={loc}
                active={locale === loc}
                onClick={() => setLocale(loc)}
                label={LOCALE_NAMES[loc]}
              />
            ))}
          </div>

          <MenuLink href="/settings" icon={<User size={16} />} label={t('nav.profile')} onClick={() => setOpen(false)} />
          <MenuLink href="/settings" icon={<Settings size={16} />} label={t('nav.settings')} onClick={() => setOpen(false)} />

          <div className="my-1 h-px bg-border" />

          <button
            type="button"
            role="menuitem"
            onClick={signOut}
            disabled={busy}
            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-footnote font-medium text-danger transition-fast hover:bg-danger/10 disabled:opacity-50"
          >
            <LogOut size={16} />
            {t('nav.signOut')}
          </button>
        </div>,
        document.body,
      )}
    </div>
  );
}

function ThemeChip({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-caption font-semibold transition-fast ${
        active ? 'bg-surface text-primary shadow-sm' : 'text-tertiary hover:text-secondary'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function MenuLink({
  href,
  icon,
  label,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-footnote font-medium text-secondary transition-fast hover:bg-hover hover:text-primary"
    >
      {icon}
      {label}
    </Link>
  );
}
