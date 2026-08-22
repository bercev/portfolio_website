"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import { useHydratedReducedMotion } from "@/lib/use-hydrated-reduced-motion";

import styles from "./circular-gallery.module.css";

export type CircularGalleryItem = {
  readonly id: string;
  readonly label: string;
  readonly content: ReactNode;
};

type CircularItemPresentation = {
  readonly offset: number;
  readonly opacity: number;
  readonly zIndex: number;
};

type GalleryItemStyle = CSSProperties & {
  "--gallery-depth": string;
  "--gallery-opacity": number;
  "--gallery-rotate": string;
  "--gallery-scale": number;
  "--gallery-x": string;
};

export function getCircularItemPresentation(
  itemIndex: number,
  activeIndex: number,
  itemCount: number,
): CircularItemPresentation {
  if (itemCount <= 0) return { offset: 0, opacity: 1, zIndex: 0 };

  let offset = itemIndex - activeIndex;
  const halfway = itemCount / 2;

  if (offset > halfway) offset -= itemCount;
  if (offset < -halfway) offset += itemCount;

  const distance = Math.abs(offset);
  return {
    offset,
    opacity: Math.max(0.25, 1 - distance * 0.35),
    zIndex: Math.max(0, itemCount - distance),
  };
}

export function CircularGallery({
  items,
  ariaLabel,
  autoRotateInterval = 6000,
}: {
  readonly items: readonly CircularGalleryItem[];
  readonly ariaLabel: string;
  readonly autoRotateInterval?: number;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useHydratedReducedMotion();
  const itemCount = items.length;

  useEffect(() => {
    if (reducedMotion || isPaused || itemCount < 2 || autoRotateInterval <= 0) {
      return;
    }

    intervalRef.current = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % itemCount);
    }, autoRotateInterval);

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRotateInterval, isPaused, itemCount, reducedMotion]);

  const selectRelativeItem = (direction: -1 | 1) => {
    if (itemCount < 2) return;
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setActiveIndex((index) => (index + direction + itemCount) % itemCount);
    setIsPaused(true);
  };

  return (
    <div
      ref={rootRef}
      className={styles.root}
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      data-circular-gallery
      data-active-index={activeIndex}
      onPointerEnter={() => setIsPaused(true)}
      onPointerLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget)) setIsPaused(false);
      }}
    >
      <div className={styles.viewport}>
        <div className={styles.track}>
          {items.map((item, index) => {
            const presentation = getCircularItemPresentation(
              index,
              activeIndex,
              itemCount,
            );
            const distance = Math.abs(presentation.offset);
            const itemStyle: GalleryItemStyle = {
              "--gallery-depth": `${distance * -140}px`,
              "--gallery-opacity": presentation.opacity,
              "--gallery-rotate": `${presentation.offset * -26}deg`,
              "--gallery-scale": Math.max(0.72, 1 - distance * 0.16),
              "--gallery-x": `${presentation.offset * 74}%`,
              zIndex: presentation.zIndex,
            };

            return (
              <div
                key={item.id}
                className={styles.item}
                style={itemStyle}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${itemCount}: ${item.label}`}
                data-carousel-active={index === activeIndex ? "true" : "false"}
                onFocusCapture={() => setActiveIndex(index)}
              >
                {item.content}
              </div>
            );
          })}
        </div>
      </div>

      {itemCount > 1 ? (
        <div className={styles.controls} aria-label="Project carousel controls">
          <button
            type="button"
            className={`${styles.control} cursor-target`}
            onClick={() => selectRelativeItem(-1)}
            aria-label="Previous project"
          >
            <span aria-hidden="true">←</span>
          </button>
          <p className={styles.status} aria-live="polite" aria-atomic="true">
            {activeIndex + 1} / {itemCount}
          </p>
          <button
            type="button"
            className={`${styles.control} cursor-target`}
            onClick={() => selectRelativeItem(1)}
            aria-label="Next project"
          >
            <span aria-hidden="true">→</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
