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

  // Padding — text jammed against a rounded edge vs comfortably inset.
  if (visual === 'padding-bad') {
    return (
      <Card>
        <div
          className="bg-elevated"
          style={{ borderRadius: 16, padding: '10px 2px', border: '1px solid var(--border, #e5e7eb)' }}
        >
          <p className="text-footnote text-secondary">Текст стоит на самой линии скругления</p>
        </div>
        <p className="mt-3 text-caption text-tertiary">padding 2px &lt; radius 16px — угол «съедает» текст</p>
      </Card>
    );
  }
  if (visual === 'padding-good') {
    return (
      <Card>
        <div
          className="bg-elevated"
          style={{ borderRadius: 16, padding: '10px 16px', border: '1px solid var(--border, #e5e7eb)' }}
        >
          <p className="text-footnote text-primary">Текст отступил от скругления</p>
        </div>
        <p className="mt-3 text-caption text-tertiary">padding 16px ≥ radius 16px — воздух по краю</p>
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

  // System status — no feedback vs visible loading state.
  if (visual === 'status-bad') {
    return (
      <Card>
        <span className="inline-block rounded-lg bg-brand px-4 py-2 text-footnote font-medium text-on-brand">
          Сохранить
        </span>
        <p className="mt-3 text-caption text-tertiary">…нажали, и ничего не происходит</p>
      </Card>
    );
  }
  if (visual === 'status-good') {
    return (
      <Card>
        <span className="inline-flex items-center gap-2 rounded-lg bg-brand/70 px-4 py-2 text-footnote font-medium text-on-brand">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          Сохранение…
        </span>
        <p className="mt-3 text-caption text-tertiary">статус виден сразу</p>
      </Card>
    );
  }

  // Contrast — failing vs passing WCAG AA text.
  if (visual === 'contrast-bad') {
    return (
      <div className="rounded-lg border border-border bg-white p-6">
        <p className="text-callout" style={{ color: '#c9cdd8' }}>
          Этот текст почти сливается с фоном
        </p>
      </div>
    );
  }
  if (visual === 'contrast-good') {
    return (
      <div className="rounded-lg border border-border bg-white p-6">
        <p className="text-callout" style={{ color: '#14171c' }}>
          Этот текст читается легко и чётко
        </p>
      </div>
    );
  }
  // Tokens — hardcoded one-off hex vs semantic tokens from the same palette.
  if (visual === 'tokens-bad') {
    return (
      <Card>
        <div className="flex gap-3">
          <Swatch color="#FF6B6B" label="#FF6B6B" />
          <Swatch color="#4ECDC4" label="#4ECDC4" />
          <Swatch color="#FFE66D" label="#FFE66D" />
        </div>
        <p className="mt-3 text-caption text-tertiary">три экрана — три случайных хекса</p>
      </Card>
    );
  }
  if (visual === 'tokens-good') {
    return (
      <Card>
        <div className="flex gap-3">
          <Swatch color="var(--brand)" label="brand" />
          <Swatch color="var(--success)" label="success" />
          <Swatch color="var(--info)" label="info" />
        </div>
        <p className="mt-3 text-caption text-tertiary">один и тот же именованный набор везде</p>
      </Card>
    );
  }

  // Components — five near-duplicate one-off buttons vs one component with size variants.
  if (visual === 'components-bad') {
    return (
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-brand/70 px-3 py-[7px] text-[11px] text-on-brand">
            Кнопка
          </span>
          <span className="rounded-sm bg-brand/70 px-4 py-[9px] text-[13px] text-on-brand">
            Кнопка
          </span>
          <span className="rounded-lg bg-brand/70 px-[18px] py-[6px] text-[12px] text-on-brand">
            Кнопка
          </span>
        </div>
        <p className="mt-3 text-caption text-tertiary">3 разных слоя вместо одного компонента</p>
      </Card>
    );
  }
  if (visual === 'components-good') {
    return (
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-brand px-3 py-1.5 text-footnote font-medium text-on-brand">
            sm
          </span>
          <span className="rounded-lg bg-brand px-5 py-2.5 text-callout font-medium text-on-brand">
            md
          </span>
          <span className="rounded-lg bg-brand px-6 py-3 text-callout font-medium text-on-brand">
            lg
          </span>
        </div>
        <p className="mt-3 text-caption text-tertiary">один компонент, свойство size</p>
      </Card>
    );
  }
  // Navigation bars — everything crammed into one fixed row vs floating +
  // collapsed into a burger for the items that don't fit.
  if (visual === 'nav-bad') {
    const items = ['Главная', 'Продукт', 'Цены', 'Блог', 'О нас', 'Контакты', 'Помощь'];
    return (
      <Card>
        <div className="flex items-center gap-3 overflow-hidden rounded-md border border-border-strong bg-canvas px-3 py-2.5">
          <span className="h-4 w-4 shrink-0 rounded-sm bg-brand/60" />
          <div className="flex shrink-0 gap-3 whitespace-nowrap">
            {items.map((label) => (
              <span key={label} className="text-caption text-secondary">
                {label}
              </span>
            ))}
          </div>
        </div>
        <p className="mt-3 text-caption text-tertiary">7 пунктов текстом — на узком экране обрежется</p>
      </Card>
    );
  }
  if (visual === 'nav-good') {
    return (
      <Card>
        <div className="mx-auto flex w-fit items-center gap-4 rounded-full border border-border-strong bg-canvas px-4 py-2.5 shadow-sm">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-5 w-5 rounded-md bg-brand/50" />
          ))}
          <span className="rounded-full bg-muted px-2 py-1 text-caption text-tertiary">Ещё</span>
        </div>
        <p className="mt-3 text-caption text-tertiary">4 иконки + бургер для остального</p>
      </Card>
    );
  }
  // Forms — placeholder-as-label + generic top error vs persistent label + inline error.
  if (visual === 'form-bad') {
    return (
      <Card>
        <div className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-caption text-danger">
          Ошибка заполнения формы
        </div>
        <div className="flex h-10 items-center rounded-lg border border-border-strong bg-canvas px-3 text-footnote text-tertiary">
          Email
        </div>
      </Card>
    );
  }
  if (visual === 'form-good') {
    return (
      <Card>
        <label className="mb-1 block text-caption font-medium text-secondary">Email</label>
        <div className="flex h-10 items-center rounded-lg border border-danger bg-canvas px-3 text-footnote text-primary">
          you@example
        </div>
        <p className="mt-1 text-caption text-danger">Email должен содержать @</p>
      </Card>
    );
  }

  // Empty states — silent "no data" vs explained empty state with a CTA.
  if (visual === 'empty-bad') {
    return (
      <Card>
        <p className="py-6 text-center text-body text-tertiary">Нет данных</p>
      </Card>
    );
  }
  if (visual === 'empty-good') {
    return (
      <Card>
        <div className="flex flex-col items-center py-4 text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-xl">
            📁
          </span>
          <p className="text-callout font-medium text-primary">Пока нет проектов</p>
          <p className="mt-1 text-footnote text-tertiary">Создай первый, чтобы начать</p>
          <span className="mt-4 inline-flex rounded-lg bg-brand px-4 py-2 text-footnote font-medium text-on-brand">
            Создать проект
          </span>
        </div>
      </Card>
    );
  }
  return null;
}

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="h-10 w-10 rounded-md border border-border" style={{ background: color }} />
      <span className="text-caption text-tertiary">{label}</span>
    </div>
  );
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
