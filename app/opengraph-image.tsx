import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

import { portfolio } from "@/data/content";

export const alt = "Berat Ercevik software engineering portfolio";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

const themeCss = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");
const background = /--primary:\s*([^;]+);/.exec(themeCss)?.[1].trim();
const foreground = /--primary-foreground:\s*([^;]+);/.exec(themeCss)?.[1].trim();
const accent = /--portfolio-accent:\s*([^;]+);/.exec(themeCss)?.[1].trim();

if (!background || !foreground || !accent) {
  throw new Error("Required social card color tokens are missing from app/globals.css.");
}

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "row",
          backgroundColor: background,
          color: foreground,
        }}
      >
        <div
          style={{
            width: 18,
            height: "100%",
            display: "flex",
            backgroundColor: accent,
          }}
        />
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "72px 80px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                color: accent,
                fontFamily: "sans-serif",
                fontSize: 28,
                fontWeight: 600,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
              }}
            >
              {portfolio.identity.role}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 22,
                fontFamily: "serif",
                fontSize: 100,
                fontWeight: 400,
                letterSpacing: "-0.045em",
                lineHeight: 1,
              }}
            >
              {portfolio.identity.name}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: 84,
                height: 8,
                display: "flex",
                marginRight: 24,
                backgroundColor: accent,
              }}
            />
            <div
              style={{
                display: "flex",
                fontFamily: "sans-serif",
                fontSize: 32,
                fontWeight: 400,
              }}
            >
              {portfolio.hero.tagline}
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
