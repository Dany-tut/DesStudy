/**
 * Client-side user preferences — persisted to localStorage and applied as
 * data-attributes / classes on <html>. Every setting here has a *real*,
 * immediate effect (no fake backend toggles): theme repaints the app,
 * reduce-motion shortens every transition, high-contrast strengthens borders.
 *
 * Kept framework-free so the no-flash inline script in layout.tsx can apply
 * the same values before React hydrates (see APPLY_SNIPPET).
 */

export type ThemePref = 'system' | 'light' | 'dark';

export interface Settings {
  theme: ThemePref;
  reduceMotion: boolean;
  highContrast: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  reduceMotion: false,
  highContrast: false,
};

export const SETTINGS_KEY = 'desstudy:settings';

export function loadSettings(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* storage may be unavailable (private mode) — settings still apply live */
  }
}

/** Reflect settings onto <html> so CSS in globals.css can react to them. */
export function applySettings(settings: Settings) {
  if (typeof document === 'undefined') return;
  const el = document.documentElement;
  if (settings.theme === 'system') delete el.dataset.theme;
  else el.dataset.theme = settings.theme;
  if (settings.reduceMotion) el.dataset.motion = 'reduced';
  else delete el.dataset.motion;
  if (settings.highContrast) el.dataset.contrast = 'high';
  else delete el.dataset.contrast;
}

/**
 * Self-contained IIFE run before paint (layout.tsx) to apply persisted prefs
 * with no flash of the wrong theme. Mirrors applySettings() but standalone —
 * it can't import at that point in the document lifecycle.
 */
export const APPLY_SNIPPET = `(function(){try{var s=JSON.parse(localStorage.getItem('${SETTINGS_KEY}')||'{}');var e=document.documentElement;if(s.theme&&s.theme!=='system')e.dataset.theme=s.theme;if(s.reduceMotion)e.dataset.motion='reduced';if(s.highContrast)e.dataset.contrast='high';}catch(_){}})();`;
