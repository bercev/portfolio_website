/**
 * Normalize a CSS custom-property value for OGL's `Color.set`, which parses
 * only 3/6-digit hex and throws on anything else (it warns, then indexes
 * the null regex match).
 *
 * Chromium serializes translucent custom properties as 8-digit hex: the
 * dark theme's `--border` is authored as `rgba(238, 244, 250, 0.14)` but
 * `getComputedStyle` returns `#eef4fa24`. That value starts with `#`, so a
 * naive "starts with #" guard passes it through — and OGL throws on every
 * theme-observer refresh (run-3 iter 19: ~10 desktop TypeErrors per load).
 *
 * The shader takes vec3, so the alpha channel is dropped, not honored;
 * anything that still isn't hex falls back instead of throwing, so a future
 * token edit can never throw inside the theme observer again.
 */
export function normalizeTokenHex(value: string, fallback: string): string {
  const match = /^#([a-f\d]{3}|[a-f\d]{6}|[a-f\d]{8})$/i.exec(value.trim());
  if (!match) return fallback;
  const hex = match[1];
  return `#${hex.length === 8 ? hex.slice(0, 6) : hex}`;
}
