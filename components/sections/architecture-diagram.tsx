/**
 * Static architecture diagrams for the expanded case-study panels.
 *
 * Library decision (per loop rules): no maintained component catalog offers
 * an honest custom system diagram — Aceternity's Animated Beam is beam FX
 * (gimmick risk against the one-signature rule), and React Bits / Magic UI
 * have no diagram primitive either. A hand-drawn static SVG of the site's
 * actual systems is the right call here.
 *
 * Each diagram must PROVE in one glance what the prose can't: the system's
 * shape (dev.to "What Have You Actually Done?" + sourcely visual-storytelling
 * scope notes). Calm static SVG — FROST strokes, square corners, no
 * animation — sitting alongside Problem / Key decision / Outcome. The panel
 * prose already says everything twice, so the SVG is role="img" with a
 * one-line summary title.
 */
"use client";

import type { ComponentType } from "react";

import type { Project } from "@/data/content";

function StageBox({
  x,
  y,
  w,
  title,
  sub,
}: {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly title: string;
  readonly sub: string;
}) {
  const h = 58;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} className="journey-arch-box" />
      <text x={x + w / 2} y={y + 27} className="journey-arch-label">
        {title}
      </text>
      <text x={x + w / 2} y={y + 45} className="journey-arch-sub">
        {sub}
      </text>
    </g>
  );
}

function ArrowDef({ id }: { readonly id: string }) {
  return (
    <defs>
      <marker
        id={id}
        viewBox="0 0 10 10"
        refX="8"
        refY="5"
        markerWidth="7"
        markerHeight="7"
        orient="auto"
      >
        <path d="M0,0 L10,5 L0,10 z" className="journey-arch-head" />
      </marker>
    </defs>
  );
}

/** Vitae: editor → block-level merge engine → Postgres; Clerk for auth,
 *  GitHub Actions → Netlify deploys on every merge. */
function VitaeDiagram() {
  const cx = 190;
  return (
    <svg
      viewBox="0 0 380 312"
      className="journey-arch"
      role="img"
      aria-label="Vitae architecture: resume editor, block-level merge engine, and Postgres storage, with Clerk for auth and GitHub Actions to Netlify deploys."
    >
      <title>Vitae system diagram</title>
      <ArrowDef id="journey-arch-arrow-vitae" />
      <StageBox x={100} y={4} w={180} title="Resume editor" sub="Next.js · React" />
      <line
        x1={cx}
        y1={62}
        x2={cx}
        y2={86}
        className="journey-arch-flow"
        markerEnd="url(#journey-arch-arrow-vitae)"
      />
      <StageBox
        x={100}
        y={92}
        w={180}
        title="Merge engine"
        sub="branch · diff · block-level merge"
      />
      <line
        x1={cx}
        y1={150}
        x2={cx}
        y2={174}
        className="journey-arch-flow"
        markerEnd="url(#journey-arch-arrow-vitae)"
      />
      <StageBox
        x={100}
        y={180}
        w={180}
        title="Postgres"
        sub="Neon in prod · Docker locally"
      />
      {/* Supporting systems — no flow arrows, they enable the pipeline. */}
      <StageBox x={4} y={244} w={182} title="Clerk" sub="auth, not bespoke identity" />
      <StageBox x={194} y={244} w={182} title="CI/CD" sub="GitHub Actions → Netlify" />
    </svg>
  );
}

/** Chatbot: the grounding loop — a Discord question is answered from the
 *  indexed community history, not the base model. The return arrow is the
 *  point of the whole project. */
function ChatbotDiagram() {
  const cx = 150;
  return (
    <svg
      viewBox="0 0 380 324"
      className="journey-arch"
      role="img"
      aria-label="Chatbot architecture: a Discord question is indexed and retrieved from 10K+ community messages, answered by Llama 3 running locally in Ollama, checked by a self-correction pass, and returned to Discord as a grounded answer."
    >
      <title>Chatbot system diagram</title>
      <ArrowDef id="journey-arch-arrow-chatbot" />
      <StageBox
        x={60}
        y={4}
        w={180}
        title="Discord question"
        sub="from a community member"
      />
      <line
        x1={cx}
        y1={62}
        x2={cx}
        y2={82}
        className="journey-arch-flow"
        markerEnd="url(#journey-arch-arrow-chatbot)"
      />
      <StageBox
        x={60}
        y={88}
        w={180}
        title="Index + retrieve"
        sub="10K+ messages · LangChain"
      />
      <line
        x1={cx}
        y1={146}
        x2={cx}
        y2={166}
        className="journey-arch-flow"
        markerEnd="url(#journey-arch-arrow-chatbot)"
      />
      <StageBox x={60} y={172} w={180} title="Ollama" sub="Llama 3 · local inference" />
      <line
        x1={cx}
        y1={230}
        x2={cx}
        y2={250}
        className="journey-arch-flow"
        markerEnd="url(#journey-arch-arrow-chatbot)"
      />
      <StageBox
        x={60}
        y={256}
        w={180}
        title="Self-correction"
        sub="checked against the history"
      />
      {/* The grounding return: a square-cornered path back up to Discord. */}
      <path
        d="M 240 284 H 322 V 32 H 240"
        className="journey-arch-flow"
        markerEnd="url(#journey-arch-arrow-chatbot)"
      />
      <text x={281} y={24} className="journey-arch-sub">
        grounded answer
      </text>
    </svg>
  );
}

const projectDiagrams: Partial<Record<Project["title"], ComponentType>> = {
  Vitae: VitaeDiagram,
  "AI Discord Chatbot": ChatbotDiagram,
};

export function ArchitectureDiagram({
  title,
}: {
  readonly title: Project["title"];
}) {
  const Diagram = projectDiagrams[title];
  if (!Diagram) return null;
  return <Diagram />;
}

export function hasArchitectureDiagram(title: Project["title"]): boolean {
  return title in projectDiagrams;
}
