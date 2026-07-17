/**
 * Local, browser-side drafts for the screen editor. Each imported file becomes
 * a draft the teacher can switch between, keep, or delete — persisted to
 * localStorage so work survives a reload. This is deliberately a thin store:
 * when the DB-backed drafts milestone lands, the same shape (`EditorDraftEntry`)
 * maps onto a row, and only the four functions below get re-pointed at the API.
 */

import type { ParseResult } from './types';
import type { EditorDraft } from '@/components/editor/EditorSteps';
import type { EditorPage, PageItem } from './pages';

const KEY = 'desstudy.editor.drafts.v1';

/**
 * JSON → gzipped bytes, for the autosave request body. Screens embed base64
 * images and full SVG markup, so an uncompressed body overruns the ~10MB
 * request ceiling and reaches the server truncated.
 */
export async function gzipJson(value: unknown): Promise<Blob> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new CompressionStream('gzip'));
  return await new Response(stream).blob();
}

/**
 * One saved file: a set of pages (each its own canvas) plus optional dividers.
 * `coverPageId` marks which page's render is the file's thumbnail. `activePageId`
 * remembers which page was open so re-loading lands where you left off.
 */
export interface EditorDraftEntry {
  id: string;
  /** The AuthoredLesson this draft autosaves into, once one has been created. */
  lessonId?: string;
  fileName: string;
  items: PageItem[];
  activePageId: string;
  coverPageId: string | null;
  updatedAt: number;
}

/** The pre-pages shape (single screen per file) — migrated on read. */
interface LegacyDraftEntry {
  id: string;
  fileName: string;
  result: ParseResult;
  draft: EditorDraft;
  updatedAt: number;
}

/** Fold an old single-screen entry into a one-page draft. */
function migrate(e: EditorDraftEntry | LegacyDraftEntry): EditorDraftEntry {
  if ('items' in e && Array.isArray(e.items)) return e;
  const legacy = e as LegacyDraftEntry;
  const pageId = `${legacy.id}-p1`;
  return {
    id: legacy.id,
    fileName: legacy.fileName,
    items: [{ id: pageId, kind: 'page', name: 'Страница 1', result: legacy.result, draft: legacy.draft }],
    activePageId: pageId,
    coverPageId: pageId,
    updatedAt: legacy.updatedAt,
  };
}

/** The page marked as the file's Title/cover, else the first page (or null). */
export function coverPageOf(entry: EditorDraftEntry): EditorPage | null {
  const pages = entry.items.filter((i): i is EditorPage => i.kind === 'page');
  return pages.find((p) => p.id === entry.coverPageId) ?? pages[0] ?? null;
}

function read(): EditorDraftEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as (EditorDraftEntry | LegacyDraftEntry)[]) : [];
    return Array.isArray(arr) ? arr.map(migrate) : [];
  } catch {
    return [];
  }
}

function write(entries: EditorDraftEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    /* quota or serialization failure — drafts are best-effort */
  }
}

/** All drafts, newest edit first. */
export function listDrafts(): EditorDraftEntry[] {
  return read().sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Insert or update a draft in place; returns the persisted list (sorted). */
export function saveDraft(entry: EditorDraftEntry): EditorDraftEntry[] {
  const entries = read();
  const i = entries.findIndex((e) => e.id === entry.id);
  const next = { ...entry, updatedAt: Date.now() };
  if (i === -1) entries.push(next);
  else entries[i] = next;
  write(entries);
  return listDrafts();
}

/** Remove a draft; returns the remaining list (sorted). */
export function deleteDraft(id: string): EditorDraftEntry[] {
  write(read().filter((e) => e.id !== id));
  return listDrafts();
}
