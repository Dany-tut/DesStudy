import { Sparkles } from 'lucide-react';
import { ComingSoon } from '@/components/shell/ComingSoon';

export default function MentorPage() {
  return (
    <ComingSoon
      title="AI-ментор"
      description="Персональный наставник: разбор ошибок, подсказки, план на день, подготовка к собеседованиям. Уже работает внутри упражнений."
      icon={<Sparkles size={28} />}
    />
  );
}
