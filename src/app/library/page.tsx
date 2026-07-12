import { Library } from 'lucide-react';
import { ComingSoon } from '@/components/shell/ComingSoon';

export default function LibraryPage() {
  return (
    <ComingSoon
      title="Библиотека"
      description="Mobbin-подобная галерея: экраны, потоки, паттерны, дизайн-системы — с поиском по платформе, индустрии и компоненту."
      icon={<Library size={28} />}
    />
  );
}
