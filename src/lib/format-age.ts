/**
 * Format a unix-seconds timestamp as a short relative age ("2m ago"), so every
 * market datum can show *when* it was observed without extra plumbing
 * (`docs/spec/07-ux-map.md` §6 — every market number carries a timestamp).
 * `nowMs` is injectable for deterministic tests.
 */
export function formatAge(
  observedAtSeconds: number,
  nowMs: number = Date.now(),
): string {
  const deltaSeconds = Math.max(
    0,
    Math.floor(nowMs / 1000) - observedAtSeconds,
  );

  if (deltaSeconds < 60) return "just now";
  const minutes = Math.floor(deltaSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
