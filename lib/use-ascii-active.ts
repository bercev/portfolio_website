"use client";

import { useEffect, useState } from "react";

/**
 * True while the ASCII journey scene runs
 * (documentElement[data-ascii="active"]). While it runs, the FROST remap in
 * app/globals.css locks both theme dimensions — palette accents collapse to
 * ocean and light/dark tokens collapse to dark — so the theme controls are
 * no-ops there and must say so instead of looking clickable. Under reduced
 * motion the scene never boots, the attribute stays unset, and the controls
 * work normally. Same MutationObserver read as ascii-portrait-bust.tsx.
 */
export function useAsciiActive(): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const read = () => setActive(root.getAttribute("data-ascii") === "active");
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["data-ascii"] });
    return () => observer.disconnect();
  }, []);

  return active;
}
