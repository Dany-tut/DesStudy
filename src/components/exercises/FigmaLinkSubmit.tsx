'use client';

import { Figma, Check, ExternalLink } from 'lucide-react';
import { FIGMA_URL_PATTERN } from '@/lib/curriculum/validate';
import { useT } from '@/lib/i18n/client';

/** URL input for figma-link exercises — live-validates the shape while typing. */
export function FigmaLinkSubmit({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const { t } = useT();
  const valid = FIGMA_URL_PATTERN.test(value.trim());
  const showState = value.trim().length > 0;

  return (
    <div>
      <div
        className={[
          'flex items-center gap-3 rounded-lg border bg-surface px-4 py-3 transition-fast',
          showState
            ? valid
              ? 'border-success'
              : 'border-border-strong'
            : 'border-border focus-within:border-brand',
        ].join(' ')}
      >
        <Figma size={18} className="shrink-0 text-tertiary" />
        <input
          type="url"
          inputMode="url"
          placeholder={t('exercises.figmaLink.placeholder')}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent text-callout text-primary outline-none placeholder:text-tertiary"
        />
        {showState && valid && <Check size={16} className="shrink-0 text-success" />}
        {valid && (
          <a
            href={value.trim()}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-tertiary transition-fast hover:text-primary"
            aria-label={t('exercises.figmaLink.openLink')}
          >
            <ExternalLink size={15} />
          </a>
        )}
      </div>
      {showState && !valid && (
        <p className="mt-2 text-footnote text-tertiary">
          {t('exercises.figmaLink.invalid')}
        </p>
      )}
    </div>
  );
}
