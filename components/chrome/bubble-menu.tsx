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
import { useEffect, useRef, useState, type PointerEvent } from "react";

import type { PortfolioContent } from "@/data/content";
import { ThemeSelector } from "@/components/chrome/theme-selector";
import { ThemeToggle } from "@/components/chrome/theme-toggle";
import { Confetti, type ConfettiRef } from "@/components/ui/confetti";
import { getResumeConfettiBursts, RESUME_CONFETTI_STAGGER_MS } from "@/lib/resume-confetti";

import styles from "./bubble-menu.module.css";

type BubbleMenuProps = {
  links: PortfolioContent["contact"]["links"];
  /** The 7 chapters (same list the rail and ribbon use) — rendered as a
      separate text-link group below the bubble column, never appended to
      it: 12 bubbles would overflow the viewport and crowd the fan. */
  chapters: PortfolioContent["navigation"];
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

export function BubbleMenu({ links, chapters }: BubbleMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showItems, setShowItems] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const bubbleRefs = useRef<Array<HTMLLIElement | null>>([]);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confettiRef = useRef<ConfettiRef>(null);
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

  const handleProfileClick = (isDownload: boolean | undefined) => {
    closeMenu();
    if (!isDownload || reducedMotion) return;

    getResumeConfettiBursts().forEach((burst, index) => {
      window.setTimeout(() => {
        void confettiRef.current?.fire(burst);
      }, index * RESUME_CONFETTI_STAGGER_MS);
    });
  };

  const handleTriggerClick = () => {
    if (isOpen) closeMenu();
    else openMenu();
  };

  // A chapter link unmounts with the overlay when the menu closes, and
  // focusing the trigger inside the click handler does NOT stick: the
  // click's own default-action window moves focus back to BODY within
  // ~2ms (v151c probe), even though the trigger stays mounted. So this
  // mirrors the terminal flyout's proven `goto` pattern instead: close
  // first, navigate explicitly (same-hash scrolls directly — setting an
  // identical hash is a no-op), and focus the section itself with
  // preventScroll so focus cannot disturb the Lenis travel. Modified
  // clicks (new tab etc.) are left to the browser.
  const handleChapterClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    id: string,
  ) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    closeMenu();
    const el = document.getElementById(id);
    if (!el) return;
    if (window.location.hash === `#${id}`) {
      el.scrollIntoView({ behavior: "auto", block: "start" });
    } else {
      window.location.hash = id;
    }
    el.setAttribute("tabindex", "-1");
    el.focus({ preventScroll: true });
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
    <div className={styles.anchor} data-bubble-menu>
      <Confetti
        ref={confettiRef}
        manualstart
        globalOptions={{ resize: true, useWorker: false }}
        data-resume-confetti
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[calc(var(--z-site-header)+1)] size-full"
      />
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
                      onClick={() => handleProfileClick(link.download)}
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
            {/* Chapters: a separate group, separated from the bubbles by
                spacing alone (no label — the names are self-evident — and
                no divider rule). Plain anchors, exactly like the rail's. */}
            <ul aria-label="Chapters" className={styles.chapterList}>
              {chapters.map((chapter) => (
                <li key={chapter.id} className={styles.chapterItem}>
                  <a
                    href={`#${chapter.id}`}
                    className={`cursor-target ${styles.chapterLink}`}
                    onClick={(event) => handleChapterClick(event, chapter.id)}
                  >
                    {chapter.label}
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
