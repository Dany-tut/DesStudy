import { Settings } from 'lucide-react';
import { ComingSoon } from '@/components/shell/ComingSoon';

export default function SettingsPage() {
  return (
    <ComingSoon
      title="Настройки"
      description="Профиль, тема, язык (RU/EN), уведомления и приватность."
      icon={<Settings size={28} />}
    />
  );
}
