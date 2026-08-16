"use client";

import { ListIcon, XIcon } from "@phosphor-icons/react";
import { gsap } from "gsap";
import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";

import type { PortfolioContent } from "@/data/content";

import styles from "./bubble-menu.module.css";

type BubbleMenuProps = {
  items: PortfolioContent["navigation"];
};

const ITEM_ROTATIONS = [-7, 5, -4, 6, -5, 4, -3] as const;
const ANIMATION_DURATION = 0.46;
const STAGGER_DELAY = 0.07;
const HOVER_CLOSE_DELAY = 120;

export function BubbleMenu({ items }: BubbleMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showItems, setShowItems] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const bubbleRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const labelRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedMotion = useReducedMotion();

  const clearCloseTimer = () => {
    if (closeTimerRef.current === null) return;
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  };

  const openMenu = () => {
    clearCloseTimer();
    setShowItems(true);
    setIsOpen(true);
  };

  const closeMenu = () => {
    clearCloseTimer();
    setIsOpen(false);
  };

  const handleTriggerClick = (event: MouseEvent<HTMLButtonElement>) => {
    const supportsHover = window.matchMedia(
      "(hover: hover) and (pointer: fine)",
    ).matches;

    if (event.detail > 0 && supportsHover) {
      openMenu();
      return;
    }

    if (isOpen) closeMenu();
    else openMenu();
  };

  const handlePointerEnter = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse") return;
    openMenu();
  };

  const handlePointerLeave = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse") return;
    clearCloseTimer();
    closeTimerRef.current = setTimeout(closeMenu, HOVER_CLOSE_DELAY);
  };

  useEffect(
    () => () => {
      if (closeTimerRef.current !== null) {
        clearTimeout(closeTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      clearCloseTimer();
      setIsOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    const overlay = overlayRef.current;
    const bubbles = bubbleRefs.current.filter(
      (bubble): bubble is HTMLAnchorElement => bubble !== null,
    );
    const labels = labelRefs.current.filter(
      (label): label is HTMLSpanElement => label !== null,
    );

    if (!overlay || bubbles.length === 0) return;

    const context = gsap.context(() => {
      gsap.killTweensOf([...bubbles, ...labels]);

      if (reducedMotion) {
        gsap.set(bubbles, { clearProps: "transform", opacity: 1 });
        gsap.set(labels, { clearProps: "transform,opacity,visibility" });
        if (!isOpen) setShowItems(false);
        return;
      }

      if (isOpen) {
        gsap.set(bubbles, {
          scale: 0,
          transformOrigin: "50% 50%",
          opacity: 1,
        });
        gsap.set(labels, { y: 20, autoAlpha: 0 });

        bubbles.forEach((bubble, index) => {
          const timeline = gsap.timeline({ delay: index * STAGGER_DELAY });
          timeline.to(bubble, {
            scale: 1,
            duration: ANIMATION_DURATION,
            ease: "back.out(1.5)",
          });

          if (labels[index]) {
            timeline.to(
              labels[index],
              {
                y: 0,
                autoAlpha: 1,
                duration: ANIMATION_DURATION,
                ease: "power3.out",
              },
              `-=${ANIMATION_DURATION * 0.9}`,
            );
          }
        });
      } else {
        gsap.to(labels, {
          y: 20,
          autoAlpha: 0,
          duration: 0.18,
          ease: "power3.in",
        });
        gsap.to(bubbles, {
          scale: 0,
          duration: 0.18,
          ease: "power3.in",
          onComplete: () => setShowItems(false),
        });
      }
    }, overlay);

    return () => context.revert();
  }, [isOpen, reducedMotion, showItems]);

  return (
    <div className={styles.anchor}>
      <nav
        aria-label="Section navigation"
        className={styles.navigation}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        <button
          ref={triggerRef}
          type="button"
          aria-label="Open section navigation"
          aria-controls="section-navigation-links"
          aria-expanded={isOpen}
          className={styles.trigger}
          data-bubble-menu-trigger
          onClick={handleTriggerClick}
        >
          {isOpen ? (
            <XIcon className={styles.icon} weight="regular" aria-hidden="true" />
          ) : (
            <ListIcon
              className={styles.icon}
              weight="regular"
              aria-hidden="true"
            />
          )}
        </button>

        {showItems ? (
          <div
            ref={overlayRef}
            id="section-navigation-links"
            className={styles.overlay}
            aria-hidden={!isOpen}
            inert={!isOpen}
          >
            <div
              className={styles.safeArea}
              data-bubble-menu-safe-area
              aria-hidden="true"
            />
            <ul className={styles.list}>
              {items.map((item, index) => (
                <li
                  key={item.id}
                  className={styles.item}
                  style={{
                    "--bubble-rotation": `${ITEM_ROTATIONS[index % ITEM_ROTATIONS.length]}deg`,
                  } as React.CSSProperties}
                >
                  <a
                    ref={(element) => {
                      bubbleRefs.current[index] = element;
                    }}
                    href={`#${item.id}`}
                    className={styles.link}
                    data-bubble-menu-item
                    onClick={closeMenu}
                  >
                    <span
                      ref={(element) => {
                        labelRefs.current[index] = element;
                      }}
                      className={styles.label}
                    >
                      {item.label}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </nav>
    </div>
  );
}
