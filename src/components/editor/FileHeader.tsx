'use client';

import { useEffect, useRef, useState } from 'react';
import { PanelLeftClose, FilePlus2, ArrowLeft } from 'lucide-react';
import { useT } from '@/lib/i18n/client';
import { RENAME_FIELD } from './renameField';

interface FileHeaderProps {
  /** The file's name — doubles as the lesson's title (see the screen autosave route). */
  name: string;
  onRename: (name: string) => void;
  /** False while the file has never reached the DB (autosave in flight or failed). */
  saved: boolean;
  /** Import an SVG into the open page — the «make» flow opens the editor blank,
   *  so this is how the screen gets in. */
  onAddFile?: () => void;
  /** Leave the editor for the home grid. The draft is already autosaved, so this
   *  only closes the file — it doesn't discard it. */
  onBack?: () => void;
  onCollapse?: () => void;
}

/**
 * Both name states share one box — same height, padding and radius — so entering
 * rename swaps only the frame and background and can't shift the row. The
 * negative margin cancels the padding, keeping the name optically flush with the
 * status line below it. The field's own frame comes from RENAME_FIELD.
 */
const NAME_BOX =
  '-ml-1 h-7 w-[calc(100%+8px)] rounded-sm px-1 text-body font-semibold text-primary';

/**
 * The rail's top row: the file's name over its status, above the Pages section.
 * Double-click (or Enter on the name) renames in place — the same name titles
 * the lesson row, so this is the one place the draft gets named.
 */
export function FileHeader({ name, onRename, saved, onAddFile, onBack, onCollapse }: FileHeaderProps) {
  const { t } = useT();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  // A rename elsewhere (or loading another file) must win over stale local text.
  useEffect(() => setValue(name), [name]);
  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const next = value.trim();
    if (next && next !== name) onRename(next);
    else setValue(name);
  };

  return (
    <div className="flex shrink-0 items-start gap-2 border-b border-border px-3 py-3">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          title={t('editor.file.back')}
          aria-label={t('editor.file.back')}
          // Centred against the name's 28px box — the row is items-start, so an
          // icon this size otherwise floats up against the box's top edge.
          className="mt-1.5 shrink-0 text-tertiary transition-fast hover:text-brand"
        >
          <ArrowLeft size={16} />
        </button>
      )}
      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') {
                setValue(name);
                setEditing(false);
              }
              e.stopPropagation();
            }}
            className={`${NAME_BOX} ${RENAME_FIELD}`}
          />
        ) : (
          <button
            type="button"
            onDoubleClick={() => setEditing(true)}
            onKeyDown={(e) => e.key === 'Enter' && setEditing(true)}
            title={t('editor.file.renameHint')}
            className={`${NAME_BOX} flex items-center text-left transition-fast hover:bg-hover`}
          >
            <span className="min-w-0 truncate">{name}</span>
          </button>
        )}
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className="truncate text-caption text-tertiary">
            {saved ? t('editor.file.savedToLessons') : t('editor.file.localOnly')}
          </span>
          <span className="shrink-0 rounded-md bg-brand/10 px-1.5 py-px text-caption font-medium text-brand">
            {t('editor.file.draft')}
          </span>
        </div>
      </div>
      {onAddFile && (
        <button
          type="button"
          onClick={onAddFile}
          title={t('editor.file.addFile')}
          aria-label={t('editor.file.addFile')}
          className="mt-1.5 shrink-0 text-tertiary transition-fast hover:text-brand"
        >
          <FilePlus2 size={15} />
        </button>
      )}
      {onCollapse && (
        <button
          type="button"
          onClick={onCollapse}
          title={t('editor.sidebar.collapse')}
          className="mt-1.5 shrink-0 text-tertiary transition-fast hover:text-brand"
        >
          <PanelLeftClose size={15} />
        </button>
      )}
    </div>
  );
}
