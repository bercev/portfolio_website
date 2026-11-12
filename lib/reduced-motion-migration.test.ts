import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Regression guard for RUN9-RM-HOOK-AUDIT (run-9 iter 15).
 *
 * motion's `useReducedMotion()` freezes its first-render value
 * (`useState(prefersReducedMotion.current)`, no subscription) — and the
 * module-level singleton is initialised during SSR, so SSR-rendered
 * consumers keep the motion branch under reduced motion (verified
 * run-9 iter 1, confirmed against the installed motion 13.1.0 source:
 * `framer-motion/dist/es/utils/reduced-motion/use-reduced-motion.mjs`).
 * Every UI-branching consumer must read the preference through the native
 * `usePrefersReducedMotion()` (`lib/use-prefers-reduced-motion.ts`,
 * `useSyncExternalStore` on `(prefers-reduced-motion: reduce)`).
 *
 * The one exception is the terminal flyout: the terminal is FROZEN by the
 * user's standing post-run-4 order, so its raw-hook import is audited,
 * not migrated. If the freeze ever lifts, remove it from the allowlist
 * and migrate it like the rest.
 */

const REPO_ROOT = fileURLToPath(new URL("../", import.meta.url));
const SCAN_DIRS = ["app", "components", "lib"] as const;
const FROZEN_RAW_HOOK_FILE = "components/terminal/terminal-flyout.tsx";

const RAW_HOOK_IMPORT =
  /import\s*\{[^}]*\buseReducedMotion\b[^}]*\}\s*from\s*["']motion\/react["']/;

function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectSourceFiles(full, out);
      continue;
    }
    if (/\.(tsx?|mts|cts)$/.test(entry) && !entry.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

describe("reduced-motion hook migration (RUN9-RM-HOOK-AUDIT)", () => {
  it("no non-frozen source file imports motion's useReducedMotion", () => {
    const offenders: string[] = [];
    for (const dir of SCAN_DIRS) {
      for (const file of collectSourceFiles(join(REPO_ROOT, dir))) {
        const rel = file.slice(REPO_ROOT.length);
        if (rel === FROZEN_RAW_HOOK_FILE) continue;
        if (RAW_HOOK_IMPORT.test(readFileSync(file, "utf8"))) {
          offenders.push(rel);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the hydrated wrapper reads the native hook, not motion's", () => {
    const src = readFileSync(
      join(REPO_ROOT, "lib/use-hydrated-reduced-motion.ts"),
      "utf8",
    );
    expect(src).toContain("usePrefersReducedMotion");
    expect(RAW_HOOK_IMPORT.test(src)).toBe(false);
  });

  it("every migrated consumer imports the native hook", () => {
    const migrated = [
      "components/chrome/bubble-menu.tsx",
      "components/chrome/profile-actions.tsx",
      "components/chrome/theme-toggle.tsx",
      "components/effects/use-dither-reveal.ts",
      "components/sections/project-case-study.tsx",
      "components/ui/chromatic-image.tsx",
      "components/ui/hover-preview.tsx",
      // run-10 RUN10-SLIDE-SEND: the slide-to-send control replaces the
      // deleted stateful-button as the contact form's motion consumer.
      "components/sections/slide-to-send.tsx",
    ];
    for (const rel of migrated) {
      const src = readFileSync(join(REPO_ROOT, rel), "utf8");
      expect(src).toContain(
        'import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion"',
      );
      expect(RAW_HOOK_IMPORT.test(src)).toBe(false);
    }
  });
});
