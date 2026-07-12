/**
 * Renders the small "good vs bad" visuals referenced by lesson examples.
 * Bad = magic-number spacing; Good = 8pt rhythm. Rendered with inline styles
 * on purpose (they must show arbitrary/off-grid values for teaching).
 */
export function ExampleVisual({ visual }: { visual: string }) {
  if (visual === 'spacing-bad') {
    return (
      <Card>
        <Bar w="70%" mb={7} />
        <Bar w="90%" mb={13} muted />
        <Bar w="55%" mb={19} muted />
        <Bar w="80%" muted />
      </Card>
    );
  }
  if (visual === 'spacing-good') {
    return (
      <Card>
        <Bar w="70%" mb={8} />
        <Bar w="90%" mb={16} muted />
        <Bar w="55%" mb={16} muted />
        <Bar w="80%" muted />
      </Card>
    );
  }

  // Radius — inconsistent vs consistent corner scale.
  if (visual === 'radius-bad') {
    return (
      <Card>
        <div className="flex gap-3">
          <Chip radius={3} />
          <Chip radius={11} />
          <Chip radius={19} />
        </div>
      </Card>
    );
  }
  if (visual === 'radius-good') {
    return (
      <Card>
        <div className="flex gap-3">
          <Chip radius={6} />
          <Chip radius={10} />
          <Chip radius={14} />
        </div>
      </Card>
    );
  }

  // Hierarchy — flat (no contrast) vs clear size/weight hierarchy.
  if (visual === 'hierarchy-bad') {
    return (
      <Card>
        <p className="text-body text-secondary">Заголовок экрана</p>
        <p className="text-body text-secondary">Подзаголовок раздела</p>
        <p className="text-body text-secondary">Основной текст описания.</p>
      </Card>
    );
  }
  if (visual === 'hierarchy-good') {
    return (
      <Card>
        <p className="text-title3 font-semibold text-primary">Заголовок экрана</p>
        <p className="text-callout font-medium text-primary">Подзаголовок раздела</p>
        <p className="text-footnote text-tertiary">Основной текст описания.</p>
      </Card>
    );
  }
  return null;
}

function Chip({ radius }: { radius: number }) {
  return (
    <div
      className="h-12 w-12 border border-border-strong bg-brand/40"
      style={{ borderRadius: radius }}
    />
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-6">{children}</div>
  );
}

function Bar({ w, mb = 0, muted = false }: { w: string; mb?: number; muted?: boolean }) {
  return (
    <div
      className={`h-3 rounded-sm ${muted ? 'bg-muted' : 'bg-brand/60'}`}
      style={{ width: w, marginBottom: mb }}
    />
  );
}
