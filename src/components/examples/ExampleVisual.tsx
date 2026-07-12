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
  return null;
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
