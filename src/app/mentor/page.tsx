import { Sparkles } from 'lucide-react';
import { ComingSoon } from '@/components/shell/ComingSoon';
import { getT } from '@/lib/i18n/server';

export default async function MentorPage() {
  const { t } = await getT();
  return (
    <ComingSoon
      title={t('mentor.title')}
      description={t('mentor.description')}
      icon={<Sparkles size={28} />}
    />
  );
}
