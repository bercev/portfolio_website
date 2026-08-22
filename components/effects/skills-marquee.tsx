"use client";

import { useEffect, useState } from "react";

import type { PortfolioContent } from "@/data/content";
import {
  FINE_POINTER_QUERY,
  MOBILE_QUERY,
  REDUCED_MOTION_QUERY,
  getEffectProfile,
} from "@/lib/effect-policy";

import { CurvedLoop, formatCurvedSkillText } from "./curved-loop";

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
      className="space-y-3"
      data-skills-marquee={enhanced ? "enhanced" : "static"}
    >
      {rows.map((categories, index) => (
        <div
          key={categories.map((category) => category.category).join("-")}
          data-skills-row
          data-direction={index === 0 ? "forward" : "reverse"}
          tabIndex={0}
          className="curved-loop-row rounded-[var(--radius)] py-0.5 focus-visible:outline-none"
        >
          <div data-skills-track className="curved-loop-track">
            <div data-skills-original>
              <CurvedLoop
                marqueeText={categories.map(formatCurvedSkillText).join("  •  ")}
                speed={enhanced ? 1.25 : 0}
                curveAmount={0}
                direction={index === 0 ? "left" : "right"}
                interactive={enhanced}
                className="curved-loop-text"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
