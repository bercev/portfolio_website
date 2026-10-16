import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

import { portfolio } from "@/data/content";
import { loadOgFont } from "@/lib/og-fonts";

export const alt = "Paper details";

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

export function generateStaticParams() {
  return portfolio.publications.map((paper) => ({ slug: paper.slug }));
}

export default async function PaperOpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const publication = portfolio.publications.find((paper) => paper.slug === slug);
  const title = publication?.title ?? "Publication";
  const venue = publication?.venue ?? "";
  const authors = publication?.authors.map((a) => a.name).join(", ") ?? "";

  const [regular, medium] = await Promise.all([
    loadOgFont("Bricolage Grotesque", 400),
    loadOgFont("Bricolage Grotesque", 500),
  ]);
  const fonts = [regular, medium].filter((font) => font !== null);
  const displayFamily = regular ? "Bricolage Grotesque" : "sans-serif";
  const monoFamily = medium ? "Bricolage Grotesque" : "sans-serif";

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
                fontFamily: monoFamily,
                fontSize: 24,
                fontWeight: 500,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              Publication
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 26,
                fontFamily: displayFamily,
                fontSize: 64,
                fontWeight: 400,
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
              }}
            >
              {title}
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
                height: 6,
                display: "flex",
                marginRight: 24,
                backgroundColor: accent,
              }}
            />
            <div
              style={{
                display: "flex",
                fontFamily: monoFamily,
                fontSize: 22,
                fontWeight: 500,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                opacity: 0.8,
              }}
            >
              {[authors, venue].filter(Boolean).join("  ·  ")}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
