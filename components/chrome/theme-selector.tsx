"use client";

import { CheckIcon, PaletteIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

import { THEME_PALETTES, type ThemePalette } from "@/lib/theme-palette";
import { usePalette } from "@/components/providers/palette-provider";

import styles from "./theme-selector.module.css";

export function ThemeSelector() {
  const { palette, setPalette } = usePalette();
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
    <div ref={selectorRef} className={styles.selector} data-theme-selector>
      <button
        type="button"
        className={`cursor-target ${styles.trigger}`}
        aria-label={`Color theme: ${THEME_PALETTES[palette].label}`}
        aria-controls="theme-palette-options"
        aria-expanded={isOpen}
        title="Choose a color theme"
        style={{
          color: THEME_PALETTES[palette].foreground,
          backgroundColor: THEME_PALETTES[palette].accent,
        }}
        onClick={() => setIsOpen((open) => !open)}
      >
        <PaletteIcon className={styles.icon} weight="regular" aria-hidden="true" />
      </button>
      <div
        id="theme-palette-options"
        className={styles.options}
        data-open={isOpen}
        aria-label="Color theme options"
        aria-hidden={!isOpen}
      >
        {Object.entries(THEME_PALETTES).map(([name, option], index) => {
          const themeName = name as ThemePalette;
          const isSelected = themeName === palette;
          return (
            <button
              key={themeName}
              type="button"
              className={`cursor-target ${styles.option}`}
              style={
                {
                  "--option-index": index,
                  color: option.foreground,
                  backgroundColor: option.accent,
                } as React.CSSProperties
              }
              aria-label={`${option.label} color theme${isSelected ? ", selected" : ""}`}
              title={option.label}
              tabIndex={isOpen ? 0 : -1}
              onClick={() => {
                setPalette(themeName);
                setIsOpen(false);
              }}
            >
              {isSelected ? <CheckIcon className={styles.check} weight="bold" aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
