/**
 * Expandable project case-study rows.
 *
 * Library decision (per loop rules): no maintained component catalog offers
 * text-first expandable case-study rows — Aceternity's Expandable Cards is a
 * horizontal image-strip pattern and its Layout Grid is a modal-overlay
 * gallery; neither fits this editorial ledger. The expand *mechanism* is
 * library-backed anyway: motion's AnimatePresence + height animation (the
 * same pattern as the existing HoverPreview), with reduced-motion support.
 */
"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef, useState, type MouseEvent } from "react";
import { flushSync } from "react-dom";

import { ExternalLink } from "@/components/ui/external-link";
import { TechPills } from "@/components/ui/tech-pills";
import { DITHER_ROW_STAGGER, useDitherReveal } from "@/components/effects/use-dither-reveal";
import type { Project } from "@/data/content";
import { isProjectHash, projectAnchorId } from "@/lib/project-anchor";
import { LIQUID_TAP_PULSE_MS } from "@/lib/project-liquid";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import {
  dispatchSkillHighlight,
  resolveSkillParam,
  techKeyList,
} from "@/lib/skill-work";

import { ArchitectureDiagram, hasArchitectureDiagram } from "./architecture-diagram";
import { CaseDetailSection, caseStudyDetails } from "./case-detail";
import { DispatchPlate, FoldTab } from "./case-fold-tab";
import { ProjectLightFrame, flowLabels } from "./project-light-frame";
import {
  ProjectPreviewLiquid,
  type ProjectPreview,
} from "./project-preview-liquid";
import { SparkleBurst } from "./sparkle-burst";

const projectPreviews: Partial<Record<Project["title"], ProjectPreview>> = {
  Vitae: {
    src: "/assets/projects/vitae.webp",
    alt: "Vitae landing page: resume version control with Get Started and Why Vitae.",
    chromatic: true,
  },
  // The chatbot has no screenshot-able product surface (it lives inside
  // Discord), so its preview is the existing hand-made illustration of the
  // bot answering in a channel — deliberately labeled as an illustration,
  // not presented as a screenshot.
  "AI Discord Chatbot": {
    src: "/assets/projects/discord-chatbot.svg",
    alt: "Illustration of the AI Discord chatbot answering a question in a Discord channel.",
  },
};

function CaseStudyPanel({ project }: { readonly project: Project }) {
  const caseStudy = project.caseStudy;
  if (!caseStudy) return null;

  const liveHref = project.live;
  const sourceHref = project.source;
  const legacyHref =
    !liveHref && !sourceHref ? project.href : undefined;
  // RUN10-CASE: the interior is the case study's detail sections — each
  // present subsection a numbered light section (glow dot + flow number,
  // press-in + rule draw on open), the Snapshot a quiet light field, the
  // metrics a glowing-values strip. Copy verbatim; the numbering closes
  // up around sections a project doesn't have (see case-detail.tsx).
  const details = caseStudyDetails(
    caseStudy,
    hasArchitectureDiagram(project.title),
    Boolean(liveHref || sourceHref || legacyHref),
  );

  return (
    <div className="journey-case-study">
      {details.map((detail, index) => (
        <CaseDetailSection key={detail.key} index={index} total={details.length} label={detail.label}>
          {detail.kind === "prose" ? (
            <p className="journey-body journey-case-study-text">{detail.text}</p>
          ) : detail.kind === "architecture" ? (
            <ArchitectureDiagram title={project.title} />
          ) : detail.kind === "outcome" ? (
            <>
              <p className="journey-body journey-case-study-text">{detail.text}</p>
              {caseStudy.metrics && caseStudy.metrics.length > 0 ? (
                <ul className="journey-case-study-metrics">
                  {caseStudy.metrics.map((metric) => (
                    <li key={metric}>{metric}</li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : detail.kind === "snapshot" ? (
            <dl className="journey-case-study-roles">
              {caseStudy.role ? (
                <div>
                  <dt>My role</dt>
                  <dd>{caseStudy.role}</dd>
                </div>
              ) : null}
              {caseStudy.team ? (
                <div>
                  <dt>Team</dt>
                  <dd>{caseStudy.team}</dd>
                </div>
              ) : null}
              {caseStudy.timeline ? (
                <div>
                  <dt>Timeline</dt>
                  <dd>{caseStudy.timeline}</dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <div className="journey-case-study-links">
              {liveHref ? (
                <ExternalLink
                  href={liveHref}
                  className="decoration-portfolio-accent"
                  iconSize={20}
                >
                  Live demo
                </ExternalLink>
              ) : null}
              {sourceHref ? (
                <ExternalLink
                  href={sourceHref}
                  className="decoration-portfolio-accent"
                  iconSize={20}
                >
                  Source code
                </ExternalLink>
              ) : null}
              {legacyHref ? (
                <ExternalLink
                  href={legacyHref}
                  className="decoration-portfolio-accent"
                  iconSize={20}
                >
                  Open project
                </ExternalLink>
              ) : null}
            </div>
          )}
        </CaseDetailSection>
      ))}

      {/* RUN10-PROJECTS: the conversion line is a next-step light line
          (see case-fold-tab.tsx) — a reader who just finished the
          evidence gets a next step, in plain language. */}
      <div className="journey-case-study-section">
        <DispatchPlate />
      </div>
    </div>
  );
}

export function CaseStudyRow({
  project,
  featured = false,
  index = 0,
  total = 1,
  skillNames,
}: {
  readonly project: Project;
  readonly featured?: boolean;
  /** Position in the project list — staggers the dither reveal (R3). */
  readonly index?: number;
  /** Project count — the light header reads "01 / 02". */
  readonly total?: number;
  /** Ledger skill names, for the reverse-navigation pill links. */
  readonly skillNames: readonly string[];
}) {
  const [open, setOpen] = useState(false);
  // RUN10-LIQUID: the preview morphs while its row is hovered/focused
  // (desktop) or inside a tap pulse (mobile). Each row owns its own
  // flag; the shared liquid blob (one layoutId) glides between rows on
  // its own. Reduced motion renders the plain static preview instead.
  const [liquid, setLiquid] = useState(false);
  // RUN10-SPARKLE: every hover-enter / focus / tap replays the light
  // burst from the preview's corner. A counter, not a boolean — the
  // burst re-mounts (and replays) on each increment.
  const [sparkle, setSparkle] = useState(0);
  const fireSparkle = () => {
    setSparkle((count) => count + 1);
  };
  const liquidTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (liquidTapTimerRef.current !== null) {
        clearTimeout(liquidTapTimerRef.current);
      }
    },
    [],
  );
  const startLiquidTapPulse = () => {
    setLiquid(true);
    if (liquidTapTimerRef.current !== null) {
      clearTimeout(liquidTapTimerRef.current);
    }
    liquidTapTimerRef.current = setTimeout(() => {
      setLiquid(false);
    }, LIQUID_TAP_PULSE_MS);
  };
  // Print record (run-3 iter 27): expanded panels are unmounted when
  // closed, so no print stylesheet can reveal them (iter 12 documented the
  // CSS-only impossibility). beforeprint expands every case-study row for
  // the paper record and afterprint restores the screen state — the row's
  // own `open` state is never touched, so restore is just clearing this
  // flag. flushSync commits before beforeprint returns, and the print
  // branch below renders a plain div, never the height-animated motion
  // panel — so the print layout sees full-height panels, not a mid-
  // animation frame. Verified: headless page.pdf() fires beforeprint once
  // and afterprint once (vf157 baseline probe on HEAD 302101a).
  const [printOpen, setPrintOpen] = useState(false);
  const panelId = useId();
  const shouldReduceMotion = usePrefersReducedMotion();
  // RUN8-STYLE-DITHER: the row dissolves in through the blue-noise tile
  // on first scroll into view (reel-4 rule 16, masks for reveals).
  // RUN8-R3-RESIDUAL: rows stagger 30ms apart (reel-4 rule 3).
  const revealRef = useDitherReveal<HTMLElement>(index * DITHER_ROW_STAGGER);
  const preview = projectPreviews[project.title];
  const rowId = projectAnchorId(project.title);
  // RUN10-PROJECTS: the row is a field of light — a number + count header
  // with a glow dot, a light beam across the top edge (see
  // project-light-frame.tsx), and a light-rule footer. The labels
  // duplicate visible text, so the chrome is hidden from AT.
  const labels = flowLabels(index, total);

  // Reverse skill navigation (run-3 iter 23): the pills live INSIDE
  // this toggle button, so they cannot themselves be <button>s (nested
  // interactive content is invalid HTML and an axe violation). The
  // click is delegated instead: a click landing on a pill that resolves
  // to a ledger skill dispatches the highlight event and does NOT
  // toggle the row; every other click toggles as before. Unlinked
  // pills stay static labels — their click toggles, exactly as before
  // this change. Keyboard parity note: pills are not separately
  // focusable, so the ledger's own skill buttons remain the keyboard
  // path to a skill's entry; the ledger itself is reachable via rail,
  // FAB, and #skills.
  const handleToggleClick = (event: MouseEvent<HTMLButtonElement>) => {
    const target = event.target as HTMLElement | null;
    const key = target?.closest?.("[data-tech]")?.getAttribute("data-tech");
    if (
      key !== null &&
      key !== undefined &&
      resolveSkillParam(key, skillNames) !== null
    ) {
      dispatchSkillHighlight(key);
      return;
    }
    setOpen((value) => !value);
  };

  // Deep-link entry (run-3 iter 14): a #project-<slug> hash — from a
  // skills-ledger proof link or a shared URL — expands this row on load
  // and on later hash changes (e.g. a ledger link clicked while already
  // on the page). Mount-effect only, never a lazy initializer, so SSR
  // HTML stays identical (run-2 iter 43 hydration sign). The hash never
  // closes a row: it is an entry affordance, not a router.
  //
  // The scroll re-asserts are load-bearing, not belt-and-braces. The
  // browser's native anchor jump is lerped slowly by Lenis, and while
  // the viewport is still travelling, this row's expansion grows the
  // page above the viewport's current position, so scroll anchoring
  // shoves the viewport past the row (measured: +~1750px overshoot on
  // the hashchange path, row ending 4338px above the viewport). The
  // first scroll (next frame) gets the journey started; the second —
  // after the 0.45s height animation, when no more growth can trigger
  // an anchoring adjustment — sticks. Verified: the rAF scroll alone
  // still overshot on desktop (row top -1810) while fresh loads and
  // mobile landed clean, so the second pass is what closes the race.
  useEffect(() => {
    let reassert: number | undefined;
    const expandIfHashed = () => {
      if (!isProjectHash(window.location.hash, project.title)) return;
      setOpen(true);
      const scrollRow = () => {
        document
          .getElementById(rowId)
          ?.scrollIntoView({ behavior: "auto", block: "start" });
      };
      requestAnimationFrame(scrollRow);
      window.clearTimeout(reassert);
      reassert = window.setTimeout(() => {
        if (isProjectHash(window.location.hash, project.title)) scrollRow();
      }, 650);
    };
    expandIfHashed();
    window.addEventListener("hashchange", expandIfHashed);
    return () => {
      window.removeEventListener("hashchange", expandIfHashed);
      window.clearTimeout(reassert);
    };
  }, [project.title, rowId]);

  // Print expansion (see the printOpen note above): rows with no case
  // study have no panel to expand, so they never subscribe.
  useEffect(() => {
    if (!project.caseStudy) return;
    const expandForPrint = () => {
      flushSync(() => {
        setPrintOpen(true);
      });
    };
    const restoreAfterPrint = () => {
      flushSync(() => {
        setPrintOpen(false);
      });
    };
    window.addEventListener("beforeprint", expandForPrint);
    window.addEventListener("afterprint", restoreAfterPrint);
    return () => {
      window.removeEventListener("beforeprint", expandForPrint);
      window.removeEventListener("afterprint", restoreAfterPrint);
    };
  }, [project.caseStudy]);

  return (
    <article
      id={rowId}
      ref={revealRef}
      data-dither-reveal
      className={
        featured
          ? "journey-project-flow journey-project-featured scroll-mt-[calc(4rem+env(safe-area-inset-top))]"
          : "journey-project-flow scroll-mt-[calc(4rem+env(safe-area-inset-top))]"
      }
      data-work-tech={techKeyList(project.technologies)}
    >
      <ProjectLightFrame index={index} />
      <button
        type="button"
        className="journey-case-study-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={handleToggleClick}
        onPointerEnter={() => {
          setLiquid(true);
          fireSparkle();
        }}
        onPointerLeave={() => setLiquid(false)}
        onFocusCapture={() => {
          setLiquid(true);
          fireSparkle();
        }}
        onBlurCapture={(event) => {
          const nextTarget = event.relatedTarget;
          if (
            nextTarget instanceof Node &&
            event.currentTarget.contains(nextTarget)
          ) {
            return;
          }
          setLiquid(false);
        }}
        onPointerDown={(event) => {
          if (event.pointerType === "touch") {
            startLiquidTapPulse();
            fireSparkle();
          }
        }}
      >
        {/* Light header strip: the row number and count. */}
        <span className="journey-project-head" aria-hidden="true">
          {/* RUN10-SPARKLE: the light burst fires from the header's
              glow dot — the row's light source, on the dark header
              band, so the particles read against dark instead of
              washing out on the white preview screenshot. */}
          <SparkleBurst burst={sparkle} />
          <span>
            <span className="journey-project-head-dot" />
            {labels.num} — {project.title.toUpperCase()}
          </span>
          <span>{labels.count}</span>
        </span>
        {/* At rest: problem-framed headline + product meta + one pill strip on
            the left, a calm static preview sidecar on the right. The preview
            stays a static frame at rest (not the hover popover) so it reads
            at rest and on touch devices — it only turns liquid while its
            row is hovered/focused or inside a tap pulse (RUN10-LIQUID). */}
        <span className="journey-project-rest">
          <span className="journey-project-rest-text">
            <span
              className={
                featured
                  ? "journey-project-featured-title"
                  : "journey-project-row-title"
              }
            >
              {project.framing}
            </span>
            <span className="journey-project-row-when">
              {project.title} · {project.dates}
            </span>
            <span className="journey-case-study-pills">
              <TechPills
                technologies={project.technologies}
                linkedNames={skillNames}
              />
            </span>
            {project.caseStudy ? <FoldTab open={open} /> : null}
          </span>
          {preview ? (
            <ProjectPreviewLiquid preview={preview} active={liquid} />
          ) : null}
        </span>
      </button>

      {/* Print branch: a plain div at natural height, so the print layout
          never depends on the motion panel's animation frame. AnimatePresence
          is unmounted while printing and remounts after (initial={false}),
          so a row that was open before printing reappears instantly on
          screen after print, with no re-animation. */}
      {printOpen && project.caseStudy ? (
        <div id={panelId}>
          <CaseStudyPanel project={project} />
        </div>
      ) : (
      <AnimatePresence initial={false}>
        {open && project.caseStudy ? (
          <motion.div
            key="case-study-panel"
            id={panelId}
            initial={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={
              shouldReduceMotion
                ? { opacity: 1, transition: { duration: 0 } }
                : {
                    height: "auto",
                    opacity: 1,
                    // R9: the height growth IS the move, so it eases
                    // in-out (starts and ends at rest); the opacity fade
                    // is the entrance, so it keeps the R1 site ease-out.
                    // Per-property transitions so each rule governs its
                    // own property (same per-variant pattern as
                    // hover-preview.tsx, RUN8-PREVIEW).
                    transition: {
                      height: { duration: 0.45, ease: [0.65, 0, 0.35, 1] },
                      opacity: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
                    },
                  }
            }
            exit={
              shouldReduceMotion
                ? { opacity: 0, transition: { duration: 0 } }
                : {
                    height: 0,
                    opacity: 0,
                    // R14: exit 360ms = 450ms x 0.8, same easing split
                    // as the entrance.
                    transition: {
                      height: { duration: 0.36, ease: [0.65, 0, 0.35, 1] },
                      opacity: { duration: 0.36, ease: [0.16, 1, 0.3, 1] },
                    },
                  }
            }
            style={{ overflow: "hidden" }}
          >
            <CaseStudyPanel project={project} />
          </motion.div>
        ) : null}
      </AnimatePresence>
      )}

      {/* Light footer: a glow dot and a light rule closing the row.
          Decorative chrome, so hidden from AT. */}
      <div className="journey-project-lightfoot" aria-hidden="true">
        <span className="journey-project-lightfoot-dot" />
        <span className="journey-project-lightfoot-rule" />
      </div>
    </article>
  );
}
