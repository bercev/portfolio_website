/**
 * Flow labels shared by the publications list and the paper pages:
 * "01", "01 / 02" — the same numbering as the old plate labels
 * ("FIG. 01", "PLATE 01 / 02") without the drafting words, for a site
 * that reads as light, not paper (run-10 RUN10-PAPERS / RUN10-PUBLICATIONS).
 * Pure and server-safe — it lives here (not in a "use client" module)
 * because the paper page is a server component and cannot call a
 * client-module function at prerender.
 */

/** Flow labels: "01", "01 / 02". */
export function flowLabels(index: number, total: number) {
  const n = String(index + 1).padStart(2, "0");
  const t = String(Math.max(total, 1)).padStart(2, "0");
  return { fig: n, plate: `${n} / ${t}` };
}

/** A pixel count, rounded; anything unusable prints as an em dash. */
function dimensionText(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "—";
  return String(Math.round(value));
}

/**
 * A figure's quiet light caption: "First page" plus the preview's real
 * pixel dims when usable, so the figure still measures something true
 * without a dimension frame (run-10 RUN10-PAPERS; shared with the
 * publications list since RUN10-PUBLICATIONS).
 */
export function figCaptionText(width: number, height: number): string {
  const w = dimensionText(width);
  const h = dimensionText(height);
  if (w === "—" || h === "—") return "First page";
  return `First page · ${w} × ${h}`;
}
