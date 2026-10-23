import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

// Same mark as app/icon.tsx: FROST "BE" on the solid --primary surface.
// Solid background is deliberate — iOS fills transparent areas of the
// apple-touch-icon with black (firsto.co pre-launch checklist).
const themeCss = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");
const background = /--primary:\s*([^;]+);/.exec(themeCss)?.[1].trim();
const accent = /--portfolio-accent:\s*([^;]+);/.exec(themeCss)?.[1].trim();

if (!background || !accent) {
  throw new Error("Required icon color tokens are missing from app/globals.css.");
}

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: background,
          color: accent,
          fontFamily: "sans-serif",
          fontSize: 68,
          fontWeight: 700,
          letterSpacing: "-0.06em",
        }}
      >
        BE
      </div>
    ),
    size,
  );
}
