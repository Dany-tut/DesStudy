import { Library } from 'lucide-react';
import { ComingSoon } from '@/components/shell/ComingSoon';
import { getT } from '@/lib/i18n/server';

export default async function LibraryPage() {
  const { t } = await getT();
  return (
    <ComingSoon
      title={t('library.title')}
      description={t('library.description')}
      icon={<Library size={28} />}
    />
  );
}
