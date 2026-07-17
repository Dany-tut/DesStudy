'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Editor chrome themes. `dark` is the blue-tinted original; `graphite` is its
 * neutral-gray sibling. Values match the [data-theme] blocks in globals.css.
 */
export type EditorTheme = 'dark' | 'graphite' | 'light';

export const EDITOR_THEMES: EditorTheme[] = ['dark', 'graphite', 'light'];

/** Canvas colour each theme paints behind the frames — mirrors --bg-canvas. */
export const THEME_CANVAS: Record<EditorTheme, string> = {
  dark: '#070910',
  graphite: '#0d0d0d',
  light: '#f7f8fa',
};

const KEY = 'desstudy.editor.theme';

function read(): EditorTheme {
  const stored = localStorage.getItem(KEY);
  return EDITOR_THEMES.includes(stored as EditorTheme) ? (stored as EditorTheme) : 'dark';
}

/**
 * Reads/writes the theme straight off <html> — there's no ThemeProvider, and
 * globals.css already keys every semantic token off [data-theme].
 */
export function useEditorTheme(): [EditorTheme, (t: EditorTheme) => void] {
  const [theme, setTheme] = useState<EditorTheme>('dark');

  // Post-hydration, so server and client render the same markup.
  useEffect(() => {
    const initial = read();
    setTheme(initial);
    document.documentElement.dataset.theme = initial;
  }, []);

  const apply = useCallback((next: EditorTheme) => {
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem(KEY, next);
  }, []);

  return [theme, apply];
}
