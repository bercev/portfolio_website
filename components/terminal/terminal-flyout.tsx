"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Terminal } from "./Terminal";

/**
 * Terminal flyout — the portfolio shell lives behind a hover/tap trigger
 * instead of occupying page space. Hover (fine pointers) or tap/click opens
 * a dialog drawer: right-side on desktop, bottom sheet on mobile.
 *
 * Keeps the xterm session mounted after first open so shell history survives
 * close/reopen. Esc, backdrop click, or the close button dismisses it.
 */

const HOVER_DELAY_MS = 250;
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function TerminalFlyout() {
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  /** Once true the dialog stays in the DOM (hidden) so the shell session survives. */
  const [everOpened, setEverOpened] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  /** Incremented on every open; Terminal focuses xterm when it changes. */
  const [focusSignal, setFocusSignal] = useState(0);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const hoverTimer = useRef(0);
  const finePointer = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    finePointer.current = window.matchMedia("(pointer: fine)").matches;
    return () => window.clearTimeout(hoverTimer.current);
  }, []);

  const doOpen = useCallback(() => {
    window.clearTimeout(hoverTimer.current);
    setEverOpened(true);
    setOpen(true);
    setFocusSignal((n) => n + 1);
  }, []);

  const doClose = useCallback(() => {
    setOpen(false);
    // Return focus to the trigger once the panel has slid away.
    window.setTimeout(() => triggerRef.current?.focus(), 60);
  }, []);

  const onTriggerEnter = useCallback(() => {
    if (!finePointer.current || open) return;
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(doOpen, HOVER_DELAY_MS);
  }, [doOpen, open]);

  const onTriggerLeave = useCallback(() => {
    window.clearTimeout(hoverTimer.current);
  }, []);

  // Global Esc fallback (panel-level handler covers the focused case).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") doClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, doClose]);

  // Lock body scroll while the dialog is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  /** Lightweight focus trap: cycle Tab within the dialog. */
  const onPanelKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        doClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], textarea, input, select, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [doClose],
  );

  const slide = reducedMotion ? {} : isDesktop ? { x: "103%" } : { y: "103%" };

  const backdropVariants: Variants = {
    hide: { opacity: 0, transitionEnd: { visibility: "hidden" } },
    show: { opacity: 1, visibility: "visible" },
  };
  const panelVariants: Variants = {
    hide: { ...slide, transitionEnd: { visibility: "hidden" } },
    show: { x: 0, y: 0, visibility: "visible" },
  };

  const duration = reducedMotion ? 0 : 0.45;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="terminal-flyout-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="portfolio-terminal-dialog"
        onMouseEnter={onTriggerEnter}
        onMouseLeave={onTriggerLeave}
        onClick={doOpen}
      >
        <span aria-hidden="true" className="terminal-flyout-prompt">
          $
        </span>
        <span className="terminal-flyout-cmd">./open-shell.sh</span>
        <span aria-hidden="true" className="terminal-flyout-cursor" />
      </button>

      {everOpened && (
        <>
          <motion.div
            className="terminal-flyout-backdrop"
            aria-hidden="true"
            initial="hide"
            animate={open ? "show" : "hide"}
            variants={backdropVariants}
            transition={{ duration: reducedMotion ? 0 : 0.25 }}
            onClick={doClose}
          />
          <motion.aside
            ref={panelRef}
            id="portfolio-terminal-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Interactive portfolio terminal"
            className="terminal-flyout-panel"
            initial="hide"
            animate={open ? "show" : "hide"}
            variants={panelVariants}
            transition={{ duration, ease: EASE }}
            onKeyDown={onPanelKeyDown}
          >
            <div className="terminal-flyout-header">
              <span className="terminal-flyout-title">
                bercev@portfolio: ~/shell
              </span>
              <button
                type="button"
                className="terminal-flyout-close"
                onClick={doClose}
                aria-label="Close terminal"
              >
                [esc]
              </button>
            </div>
            <Terminal
              focusSignal={focusSignal}
              bare
              className="terminal-flyout-term"
            />
          </motion.aside>
        </>
      )}
    </>
  );
}
