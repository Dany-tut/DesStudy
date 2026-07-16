'use client';

import { ExercisePlayer } from '@/components/exercises/ExercisePlayer';
import type { BreakpointExercise } from '@/lib/curriculum/types';

const measure: BreakpointExercise = {
  id: 't-measure',
  type: 'breakpoint',
  variant: 'measure',
  prompt: 'measure — поймай переход 1→2 колонки',
  explanation: 'ok measure',
};
const minWidth: BreakpointExercise = {
  id: 't-min',
  type: 'breakpoint',
  variant: 'min-width',
  targetColumns: 3,
  prompt: 'min-width — доведи до 3 колонок',
  explanation: 'ok min-width',
};
const fit: BreakpointExercise = {
  id: 't-fit',
  type: 'breakpoint',
  variant: 'fit',
  targetState: 'burger',
  prompt: 'fit — сверни в бургер',
  explanation: 'ok fit',
};

export default function BpTest() {
  return (
    <main className="mx-auto max-w-[720px] space-y-6 p-8">
      <ExercisePlayer exercise={measure} />
      <ExercisePlayer exercise={minWidth} />
      <ExercisePlayer exercise={fit} />
    </main>
  );
}
