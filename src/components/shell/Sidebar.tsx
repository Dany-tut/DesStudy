'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  Home,
  GraduationCap,
  LayoutDashboard,
  Library,
  Sparkles,
  Palette,
  Trophy,
  Settings,
  Menu,
  X,
} from 'lucide-react';

const NAV: { href: string; label: string; icon: typeof Home; soon?: boolean }[] = [
  { href: '/', label: 'Главная', icon: Home },
  { href: '/learn', label: 'Обучение', icon: GraduationCap },
  { href: '/dashboard', label: 'Дашборд', icon: LayoutDashboard },
  { href: '/library', label: 'Библиотека', icon: Library, soon: true },
  { href: '/mentor', label: 'AI-ментор', icon: Sparkles, soon: true },
  { href: '/achievements', label: 'Достижения', icon: Trophy, soon: true },
  { href: '/design-system', label: 'Дизайн-система', icon: Palette },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <>
      {/* Mobile top bar */}
      <div className="glass sticky top-0 z-sticky flex items-center justify-between px-4 py-3 md:hidden">
        <Brand />
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-primary"
          aria-label="Меню"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-overlay md:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <nav
            className="glass absolute left-0 top-0 h-full w-64 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 px-2">
              <Brand />
            </div>
            <NavList isActive={isActive} onNavigate={() => setOpen(false)} />
          </nav>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-surface p-4 md:flex">
        <div className="mb-8 px-2 pt-2">
          <Brand />
        </div>
        <NavList isActive={isActive} />
        <div className="mt-auto">
          <Link
            href="/settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-body text-secondary transition-fast hover:bg-muted hover:text-primary"
          >
            <Settings size={18} />
            Настройки
          </Link>
        </div>
      </aside>
    </>
  );
}

function NavList({
  isActive,
  onNavigate,
}: {
  isActive: (href: string) => boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon, soon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={[
              'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-body transition-fast',
              active
                ? 'bg-brand/10 font-medium text-brand'
                : 'text-secondary hover:bg-muted hover:text-primary',
            ].join(' ')}
          >
            <Icon size={18} className={active ? 'text-brand' : ''} />
            <span className="flex-1">{label}</span>
            {soon && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-caption text-tertiary">
                скоро
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-on-brand">
        <GraduationCap size={18} />
      </span>
      <span className="text-callout font-semibold text-primary">DesStudy</span>
    </Link>
  );
}
