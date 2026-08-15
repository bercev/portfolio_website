"use client";

import { useEffect, useState } from "react";

import type { PortfolioContent } from "@/data/content";
import {
  FINE_POINTER_QUERY,
  MOBILE_QUERY,
  REDUCED_MOTION_QUERY,
  getEffectProfile,
} from "@/lib/effect-policy";

import { cn } from "@/lib/utils";

type SkillCategory = PortfolioContent["skills"][number];

function SkillCopy({
  categories,
  duplicate = false,
}: {
  categories: readonly SkillCategory[];
  duplicate?: boolean;
}) {
  return (
    <div
      data-skills-copy
      data-skills-original={duplicate ? undefined : "true"}
      aria-hidden={duplicate || undefined}
      className={cn(
        "flex w-full min-w-0 flex-wrap items-center gap-x-5 gap-y-5",
        duplicate && "hidden",
      )}
    >
      {categories.map((category) => (
        <div
          key={category.category}
          className="flex w-full min-w-0 flex-wrap items-center gap-2"
        >
          <h3 className="mr-2 font-serif text-2xl font-extrabold leading-none tracking-[-0.02em] text-foreground">
            {category.category}
          </h3>
          {category.items.map((item) => (
            <span
              key={item}
              data-skill
              className="whitespace-nowrap rounded-full border border-border bg-card px-3 py-1.5 text-xs text-card-foreground shadow-[0_1px_2px_color-mix(in_srgb,var(--shadow-color)_var(--shadow-opacity),transparent)]"
            >
              {item}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkillsMarquee({
  skills,
}: {
  skills: PortfolioContent["skills"];
}) {
  const [enhanced, setEnhanced] = useState(false);
  const rows = [skills.slice(0, 2), skills.slice(2)] as const;

  useEffect(() => {
    const finePointer = window.matchMedia(FINE_POINTER_QUERY);
    const mobile = window.matchMedia(MOBILE_QUERY);
    const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);

    const updateProfile = () => {
      const profile = getEffectProfile({
        finePointer: finePointer.matches,
        mobile: mobile.matches,
        reducedMotion: reducedMotion.matches,
      });
      setEnhanced(profile.mode === "enhanced");
    };

    updateProfile();
    finePointer.addEventListener("change", updateProfile);
    mobile.addEventListener("change", updateProfile);
    reducedMotion.addEventListener("change", updateProfile);

    return () => {
      finePointer.removeEventListener("change", updateProfile);
      mobile.removeEventListener("change", updateProfile);
      reducedMotion.removeEventListener("change", updateProfile);
    };
  }, []);

  return (
    <div
      className="space-y-5"
      data-skills-marquee={enhanced ? "enhanced" : "static"}
    >
      {rows.map((categories, index) => (
        <div
          key={categories.map((category) => category.category).join("-")}
          data-skills-row
          data-direction={index === 0 ? "forward" : "reverse"}
          tabIndex={0}
          className="rounded-xl py-1 focus-visible:outline-none"
        >
          <div data-skills-track className="flex flex-wrap items-center gap-4">
            <SkillCopy categories={categories} />
            <SkillCopy categories={categories} duplicate />
          </div>
        </div>
      ))}
    </div>
  );
}
