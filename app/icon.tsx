import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const size = {
  width: 64,
  height: 64,
};

export const contentType = "image/png";

const themeCss = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");
const background = /--primary:\s*([^;]+);/.exec(themeCss)?.[1].trim();
const accent = /--portfolio-accent:\s*([^;]+);/.exec(themeCss)?.[1].trim();

if (!background || !accent) {
  throw new Error("Required icon color tokens are missing from app/globals.css.");
}

export default function Icon() {
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
          fontSize: 24,
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
