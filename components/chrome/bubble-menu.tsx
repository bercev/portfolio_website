"use client";

import {
  FilePdfIcon,
  GithubLogoIcon,
  LinkedinLogoIcon,
  ListIcon,
  XIcon,
} from "@phosphor-icons/react";
import { gsap } from "gsap";
import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";

import type { PortfolioContent } from "@/data/content";
import { ThemeSelector } from "@/components/chrome/theme-selector";
import { ThemeToggle } from "@/components/chrome/theme-toggle";

import styles from "./bubble-menu.module.css";

type BubbleMenuProps = {
  links: PortfolioContent["contact"]["links"];
};

const ITEM_ROTATIONS = [-7, 5, -4, 6, -5] as const;
const ANIMATION_DURATION = 0.46;
const STAGGER_DELAY = 0.07;
const HOVER_CLOSE_DELAY = 120;

const PROFILE_ICONS = {
  GitHub: GithubLogoIcon,
  LinkedIn: LinkedinLogoIcon,
  Resume: FilePdfIcon,
} as const;

export function BubbleMenu({ links }: BubbleMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showItems, setShowItems] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const bubbleRefs = useRef<Array<HTMLLIElement | null>>([]);
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
      (bubble): bubble is HTMLLIElement => bubble !== null,
    );
    if (!overlay || bubbles.length === 0) return;

    const context = gsap.context(() => {
      gsap.killTweensOf(bubbles);

      if (reducedMotion) {
        gsap.set(bubbles, { clearProps: "transform", opacity: 1 });
        if (!isOpen) setShowItems(false);
        return;
      }

      if (isOpen) {
        gsap.set(bubbles, {
          scale: 0,
          transformOrigin: "50% 50%",
          opacity: 1,
        });
        bubbles.forEach((bubble, index) => {
          const timeline = gsap.timeline({ delay: index * STAGGER_DELAY });
          timeline.to(bubble, {
            scale: 1,
            duration: ANIMATION_DURATION,
            ease: "back.out(1.5)",
          });

        });
      } else {
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
        aria-label="Utility menu"
        className={styles.navigation}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        <button
          ref={triggerRef}
          type="button"
          aria-label="Open utility menu"
          aria-controls="utility-menu-items"
          aria-expanded={isOpen}
          className={`cursor-target ${styles.trigger}`}
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
            id="utility-menu-items"
            className={styles.overlay}
            data-open={isOpen}
            aria-hidden={!isOpen}
            inert={!isOpen}
          >
            <div
              className={styles.safeArea}
              data-bubble-menu-safe-area
              aria-hidden="true"
            />
            <ul className={styles.list}>
              {links.map((link, index) => {
                const Icon =
                  PROFILE_ICONS[link.label as keyof typeof PROFILE_ICONS];
                return (
                  <li
                    key={link.href}
                    ref={(element) => {
                      bubbleRefs.current[index] = element;
                    }}
                    className={styles.item}
                    style={
                      {
                        "--bubble-rotation": `${ITEM_ROTATIONS[index % ITEM_ROTATIONS.length]}deg`,
                      } as React.CSSProperties
                    }
                  >
                    <a
                      href={link.href}
                      download={link.download}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={link.label}
                      className={`cursor-target ${styles.link}`}
                      data-bubble-menu-item
                      onClick={closeMenu}
                    >
                      {Icon ? (
                        <Icon
                          className={styles.itemIcon}
                          weight="regular"
                          aria-hidden="true"
                        />
                      ) : null}
                    </a>
                  </li>
                );
              })}
              <li
                ref={(element) => {
                  bubbleRefs.current[3] = element;
                }}
                className={styles.item}
                style={
                  {
                    "--bubble-rotation": `${ITEM_ROTATIONS[3]}deg`,
                  } as React.CSSProperties
                }
              >
                <ThemeToggle
                  className={`cursor-target ${styles.link}`}
                  menuItem
                />
              </li>
              <li
                ref={(element) => {
                  bubbleRefs.current[4] = element;
                }}
                className={styles.item}
                style={
                  {
                    "--bubble-rotation": `${ITEM_ROTATIONS[4]}deg`,
                  } as React.CSSProperties
                }
              >
                <ThemeSelector variant="menu" />
              </li>
            </ul>
          </div>
        ) : null}
      </nav>
    </div>
  );
}
