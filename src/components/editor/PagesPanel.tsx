'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Plus, FileText, Minus, Star, Pencil, Trash2 } from 'lucide-react';
import type { PageMeta } from '@/lib/editor/pages';
import { useT } from '@/lib/i18n/client';

interface PagesPanelProps {
  items: PageMeta[];
  activeId: string | null;
  coverId: string | null;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onSelect: (id: string) => void;
  onAddPage: () => void;
  onAddDivider: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onSetCover: (id: string) => void;
}

/**
 * The Pages rail above the Layers panel (Figma-style). Each page is its own
 * canvas; the "+" opens a small menu to add a page or a labelled divider. The
 * cover (Title) page carries a star and drives the file's thumbnail. Right-click
 * a row for cover / rename / delete. The header chevron (revealed on hover)
 * collapses the whole section.
 */
export function PagesPanel({
  items,
  activeId,
  coverId,
  collapsed,
  onToggleCollapsed,
  onSelect,
  onAddPage,
  onAddDivider,
  onRename,
  onDelete,
  onSetCover,
}: PagesPanelProps) {
  const { t } = useT();
  const [addOpen, setAddOpen] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number; id: string; kind: 'page' | 'divider' } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const pageCount = items.filter((i) => i.kind === 'page').length;

  return (
    <div className="shrink-0 border-b border-border">
      {/* ── Section header ── */}
      <div className="group flex items-center gap-1.5 px-3 py-3">
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          title={collapsed ? t('editor.sidebar.expand') : t('editor.sidebar.collapse')}
        >
          <ChevronDown
            size={13}
            className={`shrink-0 text-tertiary transition-fast ${collapsed ? 'opacity-100 -rotate-90' : 'opacity-0 group-hover:opacity-100'}`}
          />
          <span className="truncate text-caption font-semibold uppercase tracking-wide text-tertiary">{t('editor.sidebar.pages')}</span>
        </button>
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setAddOpen((v) => !v)}
            title={t('editor.pages.add')}
            className="text-tertiary transition-fast hover:text-brand"
          >
            <Plus size={15} />
          </button>
          {addOpen && (
            <Dropdown onClose={() => setAddOpen(false)} className="absolute right-0 top-6 w-52">
              <MenuItem
                icon={<FileText size={14} />}
                label={t('editor.pages.newPage')}
                onClick={() => {
                  onAddPage();
                  setAddOpen(false);
                }}
              />
              <MenuItem
                icon={<Minus size={14} />}
                label={t('editor.pages.divider')}
                onClick={() => {
                  onAddDivider();
                  setAddOpen(false);
                }}
              />
            </Dropdown>
          )}
        </div>
      </div>

      {/* ── Rows ── */}
      {!collapsed && (
        <div className="max-h-56 overflow-y-auto px-2 pb-2">
          {items.map((item) =>
            item.kind === 'divider' ? (
              <div
                key={item.id}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenu({ x: e.clientX, y: e.clientY, id: item.id, kind: 'divider' });
                }}
                className="flex items-center gap-2 px-2 py-2"
              >
                <span className="h-px flex-1 bg-border" />
                {editingId === item.id ? (
                  <InlineEdit value={item.name} onCommit={(v) => onRename(item.id, v)} onDone={() => setEditingId(null)} />
                ) : (
                  <span
                    onDoubleClick={() => setEditingId(item.id)}
                    className="shrink-0 text-caption font-medium uppercase tracking-wide text-tertiary"
                  >
                    {item.name}
                  </span>
                )}
                <span className="h-px flex-1 bg-border" />
              </div>
            ) : (
              <div
                key={item.id}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenu({ x: e.clientX, y: e.clientY, id: item.id, kind: 'page' });
                }}
                className={`group/row flex items-center gap-2 rounded-lg px-2 py-1.5 text-footnote transition-fast ${
                  item.id === activeId ? 'bg-brand/10 text-brand' : 'text-secondary hover:bg-hover'
                }`}
              >
                <FileText size={14} className="shrink-0" />
                {editingId === item.id ? (
                  <InlineEdit value={item.name} onCommit={(v) => onRename(item.id, v)} onDone={() => setEditingId(null)} />
                ) : (
                  <button
                    type="button"
                    onClick={() => onSelect(item.id)}
                    onDoubleClick={() => setEditingId(item.id)}
                    className="min-w-0 flex-1 truncate text-left font-medium"
                  >
                    {item.name}
                  </button>
                )}
                {item.id === coverId && (
                  <Star size={12} className="shrink-0 fill-warning text-warning" aria-label={t('editor.pages.cover')} />
                )}
              </div>
            ),
          )}
        </div>
      )}

      {/* ── Right-click menu ── */}
      {menu && (
        <Dropdown
          onClose={() => setMenu(null)}
          style={{ left: menu.x, top: menu.y }}
          className="fixed w-48"
          portal
        >
          {menu.kind === 'page' && (
            <MenuItem
              icon={<Star size={14} />}
              label={t('editor.pages.setCover')}
              onClick={() => {
                onSetCover(menu.id);
                setMenu(null);
              }}
            />
          )}
          <MenuItem
            icon={<Pencil size={14} />}
            label={t('editor.pages.rename')}
            onClick={() => {
              setEditingId(menu.id);
              setMenu(null);
            }}
          />
          {(menu.kind === 'divider' || pageCount > 1) && (
            <MenuItem
              icon={<Trash2 size={14} />}
              label={t('editor.pages.delete')}
              danger
              onClick={() => {
                onDelete(menu.id);
                setMenu(null);
              }}
            />
          )}
        </Dropdown>
      )}
    </div>
  );
}

/** A light popover that closes on outside-click / Escape. */
function Dropdown({
  children,
  onClose,
  className = '',
  style,
  portal = false,
}: {
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
  style?: React.CSSProperties;
  /** Render into document.body so `fixed` coords escape clipping ancestors. */
  portal?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    // Defer so the opening click doesn't immediately close it.
    const t = setTimeout(() => document.addEventListener('mousedown', onDown), 0);
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);
  const node = (
    <div
      ref={ref}
      style={style}
      className={`z-[60] rounded-xl border border-border bg-surface p-1 shadow-lg ${className}`}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </div>
  );
  if (portal && typeof document !== 'undefined') return createPortal(node, document.body);
  return node;
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-footnote font-medium transition-fast ${
        danger ? 'text-danger hover:bg-danger/10' : 'text-secondary hover:bg-hover hover:text-primary'
      }`}
    >
      <span className="shrink-0 text-tertiary">{icon}</span>
      {label}
    </button>
  );
}

/** A tiny inline text editor: autofocus, commit on Enter/blur, cancel on Escape. */
function InlineEdit({
  value,
  onCommit,
  onDone,
}: {
  value: string;
  onCommit: (v: string) => void;
  onDone: () => void;
}) {
  const [text, setText] = useState(value);
  return (
    <input
      autoFocus
      value={text}
      onChange={(e) => setText(e.target.value)}
      onFocus={(e) => e.target.select()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          onCommit(text);
          onDone();
        } else if (e.key === 'Escape') {
          onDone();
        }
      }}
      onBlur={() => {
        onCommit(text);
        onDone();
      }}
      className="min-w-0 flex-1 rounded border border-brand bg-surface px-1 py-0.5 text-footnote text-primary outline-none"
    />
  );
}
