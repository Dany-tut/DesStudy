/**
 * Copy text to the clipboard with a legacy fallback.
 *
 * `navigator.clipboard` only exists in secure contexts (https or localhost).
 * When the teacher opens the cabinet over a bare LAN IP (http://192.168.x.x)
 * the async Clipboard API is undefined and the copy buttons silently do
 * nothing. Fall back to a hidden <textarea> + document.execCommand('copy'),
 * which works on plain-http origins too. Returns true on success.
 */
export async function copyText(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to the legacy path
    }
  }
  return legacyCopy(text);
}

function legacyCopy(text: string): boolean {
  if (typeof document === 'undefined') return false;
  const ta = document.createElement('textarea');
  ta.value = text;
  // Keep it off-screen but still focusable/selectable.
  ta.style.position = 'fixed';
  ta.style.top = '-9999px';
  ta.style.opacity = '0';
  ta.setAttribute('readonly', '');
  document.body.appendChild(ta);
  try {
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(ta);
  }
}
