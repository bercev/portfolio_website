/**
 * Plate labels shared by the publications list and the paper pages:
 * "FIG. 01", "PLATE 01 / 02". Pure and server-safe — it lives here (not in
 * the "use client" publication-plate.tsx) because the paper page is a
 * server component and cannot call a client-module function at prerender.
 */

/** Plate labels: "FIG. 01", "PLATE 01 / 02". */
export function plateLabels(index: number, total: number) {
  const n = String(index + 1).padStart(2, "0");
  const t = String(Math.max(total, 1)).padStart(2, "0");
  return { fig: `FIG. ${n}`, plate: `PLATE ${n} / ${t}` };
}
