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
import { useId, useState } from "react";

import { ExternalLink } from "@/components/ui/external-link";
import { TechPills } from "@/components/ui/tech-pills";
import type { Project } from "@/data/content";

const projectPreviews: Partial<
  Record<Project["title"], { readonly src: string; readonly alt: string }>
> = {
  Vitae: {
    src: "/assets/projects/vitae.png",
    alt: "Vitae landing page: resume version control with Get Started and Why Vitae.",
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
    </div>
  );
}

export function CaseStudyRow({
  project,
  featured = false,
}: {
  readonly project: Project;
  readonly featured?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const shouldReduceMotion = useReducedMotion();
  const preview = projectPreviews[project.title];

  return (
    <article className={featured ? "journey-project-featured" : undefined}>
      <button
        type="button"
        className="journey-case-study-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
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
              <TechPills technologies={project.technologies} />
            </span>
            {project.caseStudy ? (
              <span className="journey-case-study-more" aria-hidden="true">
                {open ? "Close the case study" : "Read the case study"}
              </span>
            ) : null}
          </span>
          {preview ? (
            <span className="journey-project-rest-preview">
              {/* eslint-disable-next-line @next/next/no-img-element -- local static preview crop */}
              <img
                src={preview.src}
                alt={preview.alt}
                width={800}
                height={560}
              />
            </span>
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
