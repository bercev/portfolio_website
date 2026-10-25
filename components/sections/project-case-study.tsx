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

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useState, type MouseEvent } from "react";

import { ChromaticImage } from "@/components/ui/chromatic-image";
import { ExternalLink } from "@/components/ui/external-link";
import { TechPills } from "@/components/ui/tech-pills";
import type { Project } from "@/data/content";
import { isProjectHash, projectAnchorId } from "@/lib/project-anchor";
import {
  dispatchSkillHighlight,
  resolveSkillParam,
  techKeyList,
} from "@/lib/skill-work";

import { ArchitectureDiagram, hasArchitectureDiagram } from "./architecture-diagram";

const projectPreviews: Partial<
  Record<
    Project["title"],
    {
      readonly src: string;
      readonly alt: string;
      /** Raster proofs get the Aceternity Chromatic Image treatment. */
      readonly chromatic?: boolean;
    }
  >
> = {
  Vitae: {
    src: "/assets/projects/vitae.png",
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

  return (
    <div className="journey-case-study">

      <div className="journey-case-study-section">
        <p className="journey-case-study-label">Problem</p>
        <p className="journey-body journey-case-study-text">{caseStudy.problem}</p>
      </div>

      <div className="journey-case-study-section">
        <p className="journey-case-study-label">Key decision</p>
        <p className="journey-body journey-case-study-text">{caseStudy.decision}</p>
      </div>

      {/* The decision made visible: a calm static system diagram alongside
          Problem / Key decision / Outcome. It must prove in one glance what
          the prose can't — each system's shape. */}
      {hasArchitectureDiagram(project.title) ? (
        <div className="journey-case-study-section">
          <p className="journey-case-study-label">Architecture</p>
          <ArchitectureDiagram title={project.title} />
        </div>
      ) : null}

      {/* The direction explored and rejected — one path considered and why
          it lost. Renders only when the field is set (honest material only). */}
      {caseStudy.rejected ? (
        <div className="journey-case-study-section">
          <p className="journey-case-study-label">Not shipped</p>
          <p className="journey-body journey-case-study-text">
            {caseStudy.rejected}
          </p>
        </div>
      ) : null}

      <div className="journey-case-study-section">
        <p className="journey-case-study-label">Outcome</p>
        <p className="journey-body journey-case-study-text">{caseStudy.outcome}</p>
        {caseStudy.metrics && caseStudy.metrics.length > 0 ? (
          <ul className="journey-case-study-metrics">
            {caseStudy.metrics.map((metric) => (
              <li key={metric}>{metric}</li>
            ))}
          </ul>
        ) : null}
      </div>

      {caseStudy.evaluation ? (
        <div className="journey-case-study-section">
          <p className="journey-case-study-label">Evaluation</p>
          <p className="journey-body journey-case-study-text">
            {caseStudy.evaluation}
          </p>
        </div>
      ) : null}

      {caseStudy.role || caseStudy.team || caseStudy.timeline ? (
        <div className="journey-case-study-section">
          <p className="journey-case-study-label">Snapshot</p>
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
        </div>
      ) : null}

      {caseStudy.didntWork ? (
        <div className="journey-case-study-section">
          <p className="journey-case-study-label">What didn&apos;t work</p>
          <p className="journey-body journey-case-study-text">
            {caseStudy.didntWork}
          </p>
        </div>
      ) : null}

      {caseStudy.differently ? (
        <div className="journey-case-study-section">
          <p className="journey-case-study-label">
            What I&apos;d do differently
          </p>
          <p className="journey-body journey-case-study-text">
            {caseStudy.differently}
          </p>
        </div>
      ) : null}

      {caseStudy.tradeoffs ? (
        <div className="journey-case-study-section">
          <p className="journey-case-study-label">Trade-offs</p>
          <p className="journey-body journey-case-study-text">
            {caseStudy.tradeoffs}
          </p>
        </div>
      ) : null}

      {liveHref || sourceHref || legacyHref ? (
        <div className="journey-case-study-section journey-case-study-links">
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
      ) : null}

      {/* One calm conversion line at the end of every expanded panel: a
          reader who just finished the evidence gets a next step. Same
          treatment as the hero CTA (FROST text, calm underline,
          ≤200ms hover feedback). */}
      <div className="journey-case-study-section">
        <a href="#contact" className="cursor-target" data-case-study-cta>
          Want the full story? Let&rsquo;s talk{" "}
          <span aria-hidden="true">→</span>
        </a>
      </div>
    </div>
  );
}

export function CaseStudyRow({
  project,
  featured = false,
  skillNames,
}: {
  readonly project: Project;
  readonly featured?: boolean;
  /** Ledger skill names, for the reverse-navigation pill links. */
  readonly skillNames: readonly string[];
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const shouldReduceMotion = useReducedMotion();
  const preview = projectPreviews[project.title];
  const rowId = projectAnchorId(project.title);

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

  return (
    <article
      id={rowId}
      className={
        featured
          ? "journey-project-featured scroll-mt-[calc(4rem+env(safe-area-inset-top))]"
          : "scroll-mt-[calc(4rem+env(safe-area-inset-top))]"
      }
      data-work-tech={techKeyList(project.technologies)}
    >
      <button
        type="button"
        className="journey-case-study-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={handleToggleClick}
      >
        {/* At rest: problem-framed headline + product meta + one pill strip on
            the left, a calm static preview sidecar on the right. The preview
            stays a static frame (not the hover popover) so it reads at rest
            and on touch devices. */}
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
            {project.caseStudy ? (
              <span className="journey-case-study-more" aria-hidden="true">
                {open ? "Close the case study" : "Read the case study"}
              </span>
            ) : null}
          </span>
          {preview ? (
            preview.chromatic ? (
              <ChromaticImage
                src={preview.src}
                alt={preview.alt}
                width={800}
                height={560}
                className="journey-project-rest-preview"
              />
            ) : (
              <span className="journey-project-rest-preview">
                {/* eslint-disable-next-line @next/next/no-img-element -- local static preview crop */}
                <img
                  src={preview.src}
                  alt={preview.alt}
                  width={800}
                  height={560}
                />
              </span>
            )
          ) : null}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && project.caseStudy ? (
          <motion.div
            key="case-study-panel"
            id={panelId}
            initial={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={
              shouldReduceMotion
                ? { opacity: 1 }
                : { height: "auto", opacity: 1 }
            }
            exit={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.45,
              ease: [0.16, 1, 0.3, 1],
            }}
            style={{ overflow: "hidden" }}
          >
            <CaseStudyPanel project={project} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </article>
  );
}
