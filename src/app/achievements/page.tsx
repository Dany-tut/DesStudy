import { Trophy } from 'lucide-react';
import { ComingSoon } from '@/components/shell/ComingSoon';

export default function AchievementsPage() {
  return (
    <ComingSoon
      title="Достижения"
      description="Бейджи, уровни, ежедневные цели, скилл-деревья и таблицы лидеров — мотивация через прогресс."
      icon={<Trophy size={28} />}
    />
  );
}
