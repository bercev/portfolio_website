import { Analytics } from "@vercel/analytics/next";
import { Agentation } from "agentation";
import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, JetBrains_Mono } from "next/font/google";

import { SkipLink } from "@/components/chrome/skip-link";
import TabTitleDelight from "@/components/chrome/tab-title-delight";

import { LenisProvider } from "@/components/providers/lenis-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";

import "./globals.css";

/** One family for the whole page. Hierarchy comes from weight and size. */
const grotesk = Bricolage_Grotesque({
  variable: "--font-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

/** Terminal voice: kickers, labels, pills, nav, captions. */
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const metadataBase = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.URL ??
    "http://localhost:3000",
);
const title = "Berat Ercevik - Software Engineer & AI Researcher";
const description =
  "Software engineering portfolio featuring full-stack applications, shipped products, and published research (ICML, arXiv) by Berat Ercevik.";
const ogImage = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Berat Ercevik software engineering portfolio",
};
/** Google Search Console HTML-tag verification token.
 *  Set GOOGLE_SITE_VERIFICATION (or NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION)
 *  to the token from search.google.com → Settings → Verification, e.g.
 *  `abc123xyz`. When unset, no verification tag is emitted. */
const googleSiteVerification =
  process.env.GOOGLE_SITE_VERIFICATION ??
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
export const metadata: Metadata = {
  metadataBase,
  title,
  description,
  applicationName: "Berat Ercevik",
  authors: [{ name: "Berat Ercevik" }],
  creator: "Berat Ercevik",
  publisher: "Berat Ercevik",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title,
    description,
    siteName: "Berat Ercevik",
    images: [ogImage],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [ogImage],
  },
  ...(googleSiteVerification
    ? { verification: { google: googleSiteVerification } }
    : {}),
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f7fc" },
    { media: "(prefers-color-scheme: dark)", color: "#141d2b" },
  ],
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": "#person",
      name: "Berat Ercevik",
      jobTitle: "Software Engineer",
      description:
        "Software engineer and AI researcher: full-stack products and published research (ICML AIWILD Workshop, arXiv).",
      url: metadataBase.toString(),
      alumniOf: {
        "@type": "EducationalOrganization",
        name: "UC Santa Cruz",
      },
      knowsAbout: [
        "Multi-agent systems",
        "LLM evaluation",
        "TypeScript",
        "React",
        "Next.js",
        "Python",
        "Full-stack development",
        "Machine learning",
      ],
      sameAs: [
        "https://github.com/bercev",
        "https://linkedin.com/in/berat-ercevik",
      ],
    },
    {
      "@type": "WebSite",
      name: "Berat Ercevik",
      url: metadataBase.toString(),
      publisher: { "@id": "#person" },
    },
    {
      "@type": "ProfilePage",
      url: metadataBase.toString(),
      mainEntity: { "@id": "#person" },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${grotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body className="flex min-h-dvh flex-col bg-background font-sans text-foreground antialiased">
        <SkipLink />
        <TabTitleDelight />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ThemeProvider>
          <LenisProvider>{children}</LenisProvider>
        </ThemeProvider>
        <Analytics />
        {process.env.NODE_ENV === "development" ? (
          <Agentation endpoint="http://localhost:4747" />
        ) : null}
      </body>
    </html>
  );
}
