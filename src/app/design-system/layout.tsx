import { requireBoss } from '@/lib/auth';

/** The UI-kit gallery is an internal tool — boss only; teachers are bounced. */
export default async function DesignSystemLayout({ children }: { children: React.ReactNode }) {
  await requireBoss();
  return <>{children}</>;
}
