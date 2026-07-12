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
  MoreHorizontal,
  X,
} from 'lucide-react';

type NavItem = { href: string; label: string; icon: typeof Home; soon?: boolean };

const NAV: NavItem[] = [
  { href: '/', label: 'Главная', icon: Home },
  { href: '/learn', label: 'Обучение', icon: GraduationCap },
  { href: '/dashboard', label: 'Дашборд', icon: LayoutDashboard },
  { href: '/library', label: 'Библиотека', icon: Library, soon: true },
  { href: '/mentor', label: 'AI-ментор', icon: Sparkles, soon: true },
  { href: '/achievements', label: 'Достижения', icon: Trophy, soon: true },
  { href: '/design-system', label: 'Дизайн-система', icon: Palette },
];

/** Primary destinations for the mobile bottom bar; the rest live under "Ещё". */
const PRIMARY = ['/', '/learn', '/dashboard', '/design-system'];

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
}

export function Sidebar() {
  const isActive = useIsActive();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-surface p-4 md:flex">
        <div className="mb-8 px-2 pt-2">
          <Brand />
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => (
            <SidebarLink key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </nav>
        <div className="mt-auto">
          <SidebarLink
            item={{ href: '/settings', label: 'Настройки', icon: Settings }}
            active={isActive('/settings')}
          />
        </div>
      </aside>

      {/* Mobile bottom floating bar */}
      <BottomBar isActive={isActive} />
    </>
  );
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const { href, label, icon: Icon, soon } = item;
  return (
    <Link
      href={href}
      className={[
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-body transition-fast',
        active
          ? 'bg-brand/10 font-medium text-brand'
          : 'text-secondary hover:bg-hover hover:text-primary active:bg-pressed',
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
}

function BottomBar({ isActive }: { isActive: (href: string) => boolean }) {
  const [sheet, setSheet] = useState(false);
  const primary = NAV.filter((i) => PRIMARY.includes(i.href));
  const rest = NAV.filter((i) => !PRIMARY.includes(i.href)).concat({
    href: '/settings',
    label: 'Настройки',
    icon: Settings,
  });
  const moreActive = rest.some((i) => isActive(i.href));

  return (
    <>
      {/* "Ещё" sheet */}
      {sheet && (
        <div className="fixed inset-0 z-modal md:hidden" onClick={() => setSheet(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="glass absolute inset-x-3 bottom-3 rounded-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-center justify-between px-3 pt-2">
              <span className="text-footnote font-medium text-secondary">Разделы</span>
              <button
                onClick={() => setSheet(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-tertiary transition-fast hover:bg-hover"
                aria-label="Закрыть"
              >
                <X size={18} />
              </button>
            </div>
            {rest.map(({ href, label, icon: Icon, soon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setSheet(false)}
                className={[
                  'flex items-center gap-3 rounded-xl px-3 py-3 text-body transition-fast',
                  isActive(href)
                    ? 'bg-brand/10 font-medium text-brand'
                    : 'text-primary hover:bg-hover active:bg-pressed',
                ].join(' ')}
              >
                <Icon size={18} className={isActive(href) ? 'text-brand' : 'text-secondary'} />
                <span className="flex-1">{label}</span>
                {soon && <span className="text-caption text-tertiary">скоро</span>}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Floating tab bar */}
      <nav
        className="glass fixed inset-x-0 bottom-0 z-sticky mx-auto mb-[max(12px,env(safe-area-inset-bottom))] flex w-[calc(100%-24px)] max-w-md items-stretch justify-around rounded-2xl p-1.5 shadow-lg md:hidden"
        style={{ left: 12, right: 12 }}
      >
        {primary.map(({ href, label, icon: Icon }) => (
          <Tab key={href} href={href} label={label} Icon={Icon} active={isActive(href)} />
        ))}
        <button
          onClick={() => setSheet(true)}
          className={[
            'flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 transition-fast active:bg-pressed',
            moreActive ? 'text-brand' : 'text-tertiary',
          ].join(' ')}
        >
          <MoreHorizontal size={20} />
          <span className="text-caption font-medium">Ещё</span>
        </button>
      </nav>
    </>
  );
}

function Tab({
  href,
  label,
  Icon,
  active,
}: {
  href: string;
  label: string;
  Icon: typeof Home;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        'flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 transition-fast active:bg-pressed',
        active ? 'text-brand' : 'text-tertiary',
      ].join(' ')}
    >
      <Icon size={20} />
      <span className="text-caption font-medium">{label}</span>
    </Link>
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
