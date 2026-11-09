"use client";

import { CheckIcon, PaletteIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

import { THEME_SWATCH_ROWS } from "@/lib/theme-palette";
import { useAsciiActive } from "@/lib/use-ascii-active";
import { usePalette } from "@/components/providers/palette-provider";

import styles from "./theme-selector.module.css";

type ThemeSelectorProps = {
  readonly variant?: "compact" | "menu";
};

export function ThemeSelector({ variant = "compact" }: ThemeSelectorProps) {
  const { palette, setPalette } = usePalette();
  // Same lock as the mode toggle: while the ASCII scene runs, the FROST
  // remap + palette lock collapse every accent to ocean, so picking a
  // palette changes nothing visible. Disable with the reason instead.
  const asciiActive = useAsciiActive();
  const selectedPalette =
    THEME_SWATCH_ROWS.find((row) => row.key === palette) ?? THEME_SWATCH_ROWS[0];
  const [isOpen, setIsOpen] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);

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

  return (
    <div
      ref={selectorRef}
      className={styles.selector}
      data-placement={variant === "menu" ? "up" : "down"}
      data-theme-selector
    >
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
          upward in the menu variant, downward in the compact variant. */}
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
              onClick={() => {
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
