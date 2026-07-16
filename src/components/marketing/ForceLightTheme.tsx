'use client';

import { useEffect } from 'react';

/**
 * Pins the marketing landing to the light theme regardless of the visitor's
 * saved preference, then restores their theme when they navigate away. The
 * inline <script> below runs during initial parse so a dark-mode visitor never
 * sees a flash of their own theme before this takes effect; this effect handles
 * the soft-navigation case and the restore-on-leave.
 */
export function ForceLightTheme() {
  useEffect(() => {
    const el = document.documentElement;
    const prev = el.dataset.theme;
    el.dataset.theme = 'light';
    return () => {
      if (prev === undefined) delete el.dataset.theme;
      else el.dataset.theme = prev;
    };
  }, []);

  return (
    <script
      // Kills the flash-of-dark on a hard load: set light before first paint.
      dangerouslySetInnerHTML={{ __html: "document.documentElement.dataset.theme='light';" }}
    />
  );
}
