/**
 * Local, browser-side drafts for the screen editor. Each imported file becomes
 * a draft the teacher can switch between, keep, or delete — persisted to
 * localStorage so work survives a reload. This is deliberately a thin store:
 * when the DB-backed drafts milestone lands, the same shape (`EditorDraftEntry`)
 * maps onto a row, and only the four functions below get re-pointed at the API.
 */

import type { ParseResult } from './types';
import type { EditorDraft } from '@/components/editor/EditorSteps';

const KEY = 'desstudy.editor.drafts.v1';

/** One saved file: the parsed screen + the authoring draft that rides on it. */
export interface EditorDraftEntry {
  id: string;
  fileName: string;
  result: ParseResult;
  draft: EditorDraft;
  updatedAt: number;
}

function read(): EditorDraftEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as EditorDraftEntry[]) : [];
    return Array.isArray(arr) ? arr : [];
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
