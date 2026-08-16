"use client";

import {
  FilePdfIcon,
  GithubLogoIcon,
  LinkedinLogoIcon,
  LinkSimpleIcon,
} from "@phosphor-icons/react";
import { useReducedMotion } from "motion/react";
import { useRef } from "react";

import type { PortfolioContent } from "@/data/content";

import { Confetti, type ConfettiRef } from "@/components/ui/confetti";

type ProfileActionsProps = {
  links: PortfolioContent["contact"]["links"];
};

function ProfileIcon({ label }: { label: string }) {
  const iconProps = {
    size: 18,
    weight: "regular" as const,
    "aria-hidden": true,
  };

  switch (label) {
    case "GitHub":
      return <GithubLogoIcon {...iconProps} />;
    case "LinkedIn":
      return <LinkedinLogoIcon {...iconProps} />;
    case "Resume":
      return <FilePdfIcon {...iconProps} />;
    default:
      return <LinkSimpleIcon {...iconProps} />;
  }
}

export function ProfileActions({ links }: ProfileActionsProps) {
  const confettiRef = useRef<ConfettiRef>(null);
  const reducedMotion = useReducedMotion();

  return (
    <>
      <Confetti
        ref={confettiRef}
        manualstart
        globalOptions={{ resize: true, useWorker: false }}
        data-confetti-canvas
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[calc(var(--z-site-header)+1)] size-full"
      />

      <nav aria-label="Profile links">
        <ul className="flex items-center gap-1">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                download={link.download}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={
                  link.download
                    ? "Download resume"
                    : `Open ${link.label} profile in a new tab`
                }
                className="inline-flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-[var(--radius)] border border-transparent px-2.5 text-sm font-medium text-foreground no-underline transition-colors hover:border-border hover:bg-accent hover:text-accent-foreground sm:px-3"
                onClick={(event) => {
                  if (!link.download || reducedMotion) return;

                  const bounds = event.currentTarget.getBoundingClientRect();
                  void confettiRef.current?.fire({
                    particleCount: 90,
                    spread: 72,
                    startVelocity: 34,
                    scalar: 0.82,
                    ticks: 180,
                    origin: {
                      x: (bounds.left + bounds.width / 2) / window.innerWidth,
                      y: bounds.bottom / window.innerHeight,
                    },
                  });
                }}
              >
                <ProfileIcon label={link.label} />
                <span className="hidden sm:inline" aria-hidden="true">
                  {link.label}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
