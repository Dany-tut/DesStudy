/**
 * No-op on purpose — the admin panel ships without a login gate (explicit
 * MVP decision, real auth comes later). Every mutating admin route already
 * calls this first, so wiring in a real session check later is a one-function
 * change here, not a rewrite across every route.
 */
export function requireAdmin(): void {
  // TODO: replace with a real session/credentials check.
}
