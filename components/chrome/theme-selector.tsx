"use client";

import { CheckIcon, PaletteIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { THEME_SWATCH_ROWS, type ThemeSwatchRow } from "@/lib/theme-palette";
import {
  THEME_LAMP_FADE_MS,
  THEME_LAMP_HOLD_MS,
  lampBeamGeometry,
  lampBeamStyle,
} from "@/lib/theme-lamp";
import { useAsciiActive } from "@/lib/use-ascii-active";
import { usePalette } from "@/components/providers/palette-provider";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

import styles from "./theme-selector.module.css";

type ThemeSelectorProps = {
  readonly variant?: "compact" | "menu";
};

type LampState = {
  readonly row: ThemeSwatchRow;
  readonly rect: { left: number; right: number; top: number; height: number };
  readonly phase: "sweep" | "fade";
};

export function ThemeSelector({ variant = "compact" }: ThemeSelectorProps) {
  const { palette, setPalette } = usePalette();
  // Same lock as the mode toggle: while the ASCII scene runs, the FROST
  // remap + palette lock collapse every accent to ocean, so picking a
  // palette changes nothing visible. Disable with the reason instead.
  const asciiActive = useAsciiActive();
  const reducedMotion = usePrefersReducedMotion();
  const selectedPalette =
    THEME_SWATCH_ROWS.find((row) => row.key === palette) ?? THEME_SWATCH_ROWS[0];
  const [isOpen, setIsOpen] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);

  // RUN9-THEME-LAMP: press-and-hold a swatch row and a drafting lamp
  // projects onto the page, previewing that row's theme before committing;
  // release commits. The preview writes documentElement.dataset.palette
  // directly (no provider state, no localStorage), so cancelling leaves
  // nothing behind; the commit path goes through setPalette as usual.
  const [lamp, setLamp] = useState<LampState | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const fadeTimerRef = useRef<number | null>(null);
  const lampRowRef = useRef<ThemeSwatchRow | null>(null);
  const lampModeRef = useRef<"idle" | "previewing" | "committing">("idle");
  const lampCommittedRef = useRef(false);

  const clearHoldTimer = () => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  const restoreCommittedPalette = () => {
    if (palette === null) {
      delete document.documentElement.dataset.palette;
    } else {
      document.documentElement.dataset.palette = palette;
    }
  };

  const cancelLamp = () => {
    clearHoldTimer();
    if (fadeTimerRef.current !== null) {
      window.clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
    lampRowRef.current = null;
    lampModeRef.current = "idle";
    if (lamp !== null) restoreCommittedPalette();
    setLamp(null);
  };

  // Any path that closes the plate mid-preview (outside pointer, Escape
  // on the plate, a second press) cancels the lamp instead of leaving a
  // previewed palette stranded — except the commit path, which closes
  // the plate after the palette is already committed.
  useEffect(() => {
    if (!isOpen && lampModeRef.current === "previewing") cancelLamp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // While the lamp previews, release commits and Escape cancels. The
  // window listeners exist only for the preview's lifetime.
  useEffect(() => {
    if (lamp === null || lamp.phase !== "sweep") return;
    const row = lamp.row;
    const commitLamp = () => {
      lampModeRef.current = "committing";
      lampCommittedRef.current = true;
      setPalette(row.key);
      setLamp({ ...lamp, phase: "fade" });
      if (reducedMotion) {
        lampModeRef.current = "idle";
        lampRowRef.current = null;
        setLamp(null);
      } else {
        fadeTimerRef.current = window.setTimeout(() => {
          lampModeRef.current = "idle";
          lampRowRef.current = null;
          setLamp(null);
        }, THEME_LAMP_FADE_MS);
      }
      setIsOpen(false);
    };
    const cancelOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        cancelLamp();
        event.stopPropagation();
      }
    };
    const release = () => commitLamp();
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", cancelLamp);
    window.addEventListener("keydown", cancelOnEscape, true);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", cancelLamp);
      window.removeEventListener("keydown", cancelOnEscape, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lamp]);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !selectorRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  useEffect(
    () => () => {
      clearHoldTimer();
      if (fadeTimerRef.current !== null) {
        window.clearTimeout(fadeTimerRef.current);
      }
    },
    [],
  );

  const startLampHold = (
    row: ThemeSwatchRow,
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
    if (event.button !== 0 || asciiActive || !isOpen) return;
    const rect = event.currentTarget.getBoundingClientRect();
    lampRowRef.current = row;
    holdTimerRef.current = window.setTimeout(() => {
      holdTimerRef.current = null;
      lampModeRef.current = "previewing";
      if (row.key === null) {
        delete document.documentElement.dataset.palette;
      } else {
        document.documentElement.dataset.palette = row.key;
      }
      // Under reduced motion there is no beam — the previewed palette
      // is the settled state, and release commits it as usual.
      setLamp({
        row,
        rect: {
          left: rect.left,
          right: rect.right,
          top: rect.top,
          height: rect.height,
        },
        phase: "sweep",
      });
    }, THEME_LAMP_HOLD_MS);
  };

  const beam =
    lamp !== null && !reducedMotion
      ? createPortal(
          <div
            aria-hidden="true"
            className={styles.lampBeam}
            data-lamp-beam
            data-phase={lamp.phase}
            style={lampBeamStyle(
              lamp.row.accent,
              lampBeamGeometry(lamp.rect, window.innerWidth, window.innerHeight),
            )}
          />,
          document.body,
        )
      : null;

  return (
    <div
      ref={selectorRef}
      className={styles.selector}
      data-placement={variant === "menu" ? "up" : "down"}
      data-theme-selector
    >
      {beam}
      <button
        type="button"
        className={`cursor-target ${styles.trigger}${asciiActive ? " opacity-50" : ""}`}
        data-variant={variant}
        data-bubble-menu-item={variant === "menu" ? "" : undefined}
        aria-label={`Color theme: ${selectedPalette.label}`}
        aria-controls="theme-palette-options"
        aria-expanded={isOpen}
        title={
          asciiActive
            ? "Color theme locked while the ASCII scene runs"
            : "Choose a color theme"
        }
        disabled={asciiActive}
        style={
          palette
            ? {
                color: selectedPalette.foreground,
                backgroundColor: selectedPalette.accent,
              }
            : undefined
        }
        onClick={() => {
          setIsOpen((open) => !open);
        }}
      >
        <PaletteIcon className={styles.icon} weight="regular" aria-hidden="true" />
      </button>
      {/* Run-9 Swatch Library (RUN9-THEME-SWATCHES): the run-8 arc of five
          anonymous dots is a labeled plate now — six numbered rows (00
          BASE + the five palettes), each with its accent swatch and name,
          so the choice is readable instead of guessed. The plate is
          anchored to the trigger (right edge to right edge) and opens
          upward in the menu variant, downward in the compact variant.
          RUN9-THEME-LAMP: hold a row and the lamp previews its theme
          under a beam; release commits, Escape cancels. */}
      <div
        id="theme-palette-options"
        className={styles.options}
        data-open={isOpen}
        aria-label="Color theme options"
        aria-hidden={!isOpen}
      >
        <div aria-hidden="true" className={styles.optionsHead}>
          <span>+ Swatch Library</span>
          <span>{String(THEME_SWATCH_ROWS.length).padStart(2, "0")} plates</span>
        </div>
        <div aria-hidden="true" className={styles.optionsHint}>
          Hold a row to lamp the sheet
        </div>
        {THEME_SWATCH_ROWS.map((row, index) => {
          const isSelected = row.key === palette;
          return (
            <button
              key={row.number}
              type="button"
              className={`cursor-target ${styles.option}`}
              style={
                {
                  "--option-index": index,
                } as React.CSSProperties
              }
              data-selected={isSelected}
              aria-label={`${row.label} color theme${isSelected ? ", selected" : ""}`}
              title={row.label}
              tabIndex={isOpen ? 0 : -1}
              onPointerDown={(event) => startLampHold(row, event)}
              onPointerUp={clearHoldTimer}
              onPointerLeave={clearHoldTimer}
              onClick={() => {
                // A hold-release already committed this row on
                // pointerup — the click that follows it is the same
                // gesture, not a second tap.
                if (lampCommittedRef.current) {
                  lampCommittedRef.current = false;
                  return;
                }
                // Guard the pre-lock-open race: options opened before the
                // scene booted must not apply once it has.
                if (asciiActive) {
                  setIsOpen(false);
                  return;
                }
                // Tapping the selected row clears the override (Base is
                // the null palette, so it always clears).
                setPalette(isSelected ? null : row.key);
                setIsOpen(false);
              }}
            >
              <span aria-hidden="true" className={styles.optionNo}>
                {row.number}
              </span>
              <span
                aria-hidden="true"
                className={styles.optionSwatch}
                style={{ backgroundColor: row.accent }}
              />
              <span aria-hidden="true" className={styles.optionName}>
                {row.label}
              </span>
              {isSelected ? (
                <CheckIcon className={styles.check} weight="bold" aria-hidden="true" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
