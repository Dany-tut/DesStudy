/**
 * Claude via the KIE proxy.
 * =========================
 * The project's ANTHROPIC_API_KEY is a KIE key, not an Anthropic one, and KIE
 * fronts an Anthropic-compatible API at a different host. Two consequences make
 * the official SDK the wrong tool here — both learned the hard way in
 * `mentor.ts`, which is the one call site that already does this correctly:
 *
 *  1. Auth — the proxy expects `Authorization: Bearer`. The SDK sends
 *     `x-api-key`, which the proxy answers with an HTTP 200 whose *body* is
 *     `{"code":401}` — a wrapped 401 that never throws, so an SDK call fails
 *     silently into whatever fallback the caller has.
 *  2. WAF — the proxy 403s ("request was blocked") on the SDK's telemetry
 *     headers and User-Agent. A minimal fetch gets through cleanly.
 *
 * The base URL lives in its own var, NOT `ANTHROPIC_BASE_URL`: that one is set
 * to api.anthropic.com in this project, and the SDK would silently pick it up
 * and send the KIE key to Anthropic (→ a real 401).
 */

/** Minimal shape of the bits of an Anthropic response we read back. */
interface ProxyResponse {
  content?: { type: string; text?: string }[];
}

/** POST a Messages-API body to the proxy and return the first text block, or
 *  null when the key is missing, the request fails, or the reply has no text.
 *  Never throws — every caller here has a fallback and should use it. */
export async function claudeProxyText(body: unknown): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const base = process.env.MENTOR_BASE_URL || 'https://api.kie.ai/claude';

  try {
    const res = await fetch(`${base}/v1/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as ProxyResponse;
    // The wrapped-401 case: HTTP 200, but no content — treat as failure.
    const text = data.content?.find((b) => b.type === 'text')?.text;
    return text?.trim() ? text : null;
  } catch {
    return null;
  }
}
