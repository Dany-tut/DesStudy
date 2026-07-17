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
  UserRound,
  MoreHorizontal,
  X,
} from 'lucide-react';
import { useT } from '@/lib/i18n/client';
import { UserMenu, type UserMenuUser } from './UserMenu';

/** Nav entries carry a translation key; the label is resolved at render. */
type NavItem = { href: string; labelKey: string; icon: typeof Home; soon?: boolean };

/** Student-facing chrome — the only shell the Sidebar renders. */
const NAV: NavItem[] = [
  { href: '/', labelKey: 'nav.home', icon: Home },
  { href: '/learn', labelKey: 'nav.learn', icon: GraduationCap },
  { href: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { href: '/student', labelKey: 'nav.profile', icon: UserRound },
  { href: '/library', labelKey: 'nav.library', icon: Library, soon: true },
  { href: '/mentor', labelKey: 'nav.mentor', icon: Sparkles, soon: true },
  { href: '/achievements', labelKey: 'nav.achievements', icon: Trophy },
  { href: '/design-system', labelKey: 'nav.designSystem', icon: Palette },
];

/** Primary destinations for the mobile bottom bar; the rest live under "Ещё". */
const PRIMARY = ['/', '/learn', '/dashboard', '/student'];

/** Hrefs that should only match exactly, so a child route doesn't light the parent. */
const EXACT = new Set(['/', '/student']);

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => (EXACT.has(href) ? pathname === href : pathname.startsWith(href));
}

export function Sidebar({ user }: { user?: UserMenuUser }) {
  const isActive = useIsActive();

  return (
    <>
      {/* Desktop sidebar — floats as an inset glass panel, not a flush rail. */}
      <aside className="sticky top-0 hidden h-screen w-[272px] shrink-0 p-3 md:block">
        <div className="glass flex h-full flex-col rounded-2xl p-3 shadow-xl">
          <div className="mb-7 px-2 pt-2">
            <Brand />
          </div>
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => (
              <SidebarLink key={item.href} item={item} active={isActive(item.href)} />
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-1 border-t border-border/60 pt-2">
            {user && (
              <div className="px-1 pt-1">
                <UserMenu user={user} align="start" openUp full />
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile bottom floating bar */}
      <BottomBar isActive={isActive} />
    </>
  );
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const { href, labelKey, icon: Icon, soon } = item;
  const { t } = useT();
  return (
    <Link
      href={href}
      className={[
        'flex items-center gap-3 rounded-xl px-3 py-3 text-callout transition-fast',
        active
          ? 'bg-brand/10 font-medium text-brand'
          : 'text-secondary hover:bg-hover hover:text-primary active:bg-pressed',
      ].join(' ')}
    >
      <Icon size={20} className={active ? 'text-brand' : ''} />
      <span className="flex-1">{t(labelKey)}</span>
      {soon && (
        <span
          className="rounded-full bg-muted text-caption font-medium leading-none text-tertiary"
          style={{ padding: '3px 8px' }}
        >
          {t('common.soon')}
        </span>
      )}
    </Link>
  );
}

function BottomBar({ isActive }: { isActive: (href: string) => boolean }) {
  const { t } = useT();
  const [sheet, setSheet] = useState(false);
  const settings: NavItem = { href: '/settings', labelKey: 'nav.settings', icon: Settings };
  // Primary destinations sit in the bar; everything else overflows into "Ещё".
  const primary = NAV.filter((i) => PRIMARY.includes(i.href));
  const rest = NAV.filter((i) => !PRIMARY.includes(i.href)).concat(settings);
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
              <span className="text-footnote font-medium text-secondary">{t('nav.sections')}</span>
              <button
                onClick={() => setSheet(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-tertiary transition-fast hover:bg-hover"
                aria-label={t('nav.close')}
              >
                <X size={18} />
              </button>
            </div>
            {rest.map(({ href, labelKey, icon: Icon, soon }) => (
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
                <span className="flex-1">{t(labelKey)}</span>
                {soon && <span className="text-caption text-tertiary">{t('common.soon')}</span>}
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
        {primary.map(({ href, labelKey, icon: Icon }) => (
          <Tab key={href} href={href} label={t(labelKey)} Icon={Icon} active={isActive(href)} />
        ))}
        <button
          onClick={() => setSheet(true)}
          className={[
            'flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 transition-fast active:bg-pressed',
            moreActive ? 'text-brand' : 'text-tertiary',
          ].join(' ')}
        >
          <MoreHorizontal size={20} />
          <span className="text-caption font-medium">{t('nav.more')}</span>
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
