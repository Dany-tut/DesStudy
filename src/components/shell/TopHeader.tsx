'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowRight,
  ShieldCheck,
  BookOpen,
  Users,
  BarChart3,
  ClipboardCheck,
  type LucideIcon,
} from 'lucide-react';
import { useT } from '@/lib/i18n/client';
import { BrandLogo } from './BrandLogo';
import { UserMenu } from './UserMenu';

export interface StaffHeader {
  /** Display name (name or email). */
  name: string;
  /** Auth role — drives which sections show. */
  role: 'BOSS' | 'TEACHER';
  /** Short role label, e.g. "админ" / "препод". */
  roleLabel: string;
}

interface NavItem {
  href: string;
  /** i18n key under the `nav` namespace. */
  labelKey: string;
  icon: LucideIcon;
  /** Match only the exact path (for section roots that share a prefix). */
  exact?: boolean;
  /** Restrict to a role; omitted → visible to all staff. */
  only?: 'BOSS' | 'TEACHER';
}

/**
 * Staff sections. Teachers and the boss share the day-to-day cabinet (groups,
 * testing, lessons); "Тестирование" now folds in the grade-test results —
 * mini cards open the full breakdown in a modal — so there's no separate
 * "Результаты" tab. The boss additionally gets the Админ hub (teachers,
 * invites, school-wide analytics), which teachers never see.
 */
const NAV: NavItem[] = [
  { href: '/teacher', labelKey: 'nav.groups', icon: Users, exact: true },
  { href: '/teacher/testing', labelKey: 'nav.testing', icon: ClipboardCheck },
  { href: '/admin/editor', labelKey: 'nav.lessons', icon: BookOpen },
  { href: '/admin', labelKey: 'nav.admin', icon: ShieldCheck, exact: true, only: 'BOSS' },
];

/** On the sign-in page the "Войти" CTA is redundant — hide just the button. */
const HIDE_CTA_ON = ['/signin'];

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/**
 * Global top bar for the header-based shell (guests + staff; registered
 * learners get the Sidebar instead). Brand mark on the left; the right side
 * adapts to the viewer — a real section nav for signed-in staff, a sign-in CTA
 * for guests.
 */
export function TopHeader({ staff }: { staff?: StaffHeader | null }) {
  const { t } = useT();
  const pathname = usePathname();
  const hideCta = HIDE_CTA_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // Staff land on their shared cabinet (groups), not the learner landing page.
  const brandHref = staff ? '/teacher' : '/';

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-6 px-6 md:px-8">
        <Link href={brandHref} className="flex shrink-0 items-center gap-2.5" aria-label="DesStudy">
          <BrandLogo size={26} />
          <span className="text-callout font-bold tracking-tight text-primary">DesStudy</span>
        </Link>

        {staff ? (
          <>
            <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
              {NAV.filter((item) => !item.only || item.only === staff.role).map((item) => {
                const active = isActive(pathname, item);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-footnote font-medium transition-base ${
                      active
                        ? 'bg-brand/10 text-brand'
                        : 'text-secondary hover:bg-hover hover:text-primary'
                    }`}
                  >
                    <Icon size={16} strokeWidth={active ? 2.4 : 2} />
                    {t(item.labelKey)}
                  </Link>
                );
              })}
            </nav>

            <UserMenu
              user={{
                name: staff.name,
                subtitle: t(staff.role === 'BOSS' ? 'nav.roleBoss' : 'nav.roleTeacher'),
              }}
              align="end"
            />
          </>
        ) : (
          !hideCta && (
            <Link
              href="/signin"
              className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-footnote font-semibold text-on-brand transition-base hover:bg-brand-hover active:scale-[0.98]"
            >
              {t('home.signIn')}
              <ArrowRight size={15} />
            </Link>
          )
        )}
      </div>
    </header>
  );
}
