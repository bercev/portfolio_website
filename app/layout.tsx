import { Agentation } from "agentation";
import type { Metadata } from "next";
import { IBM_Plex_Mono, Newsreader, Schibsted_Grotesk } from "next/font/google";

import { ThemeProvider } from "@/components/providers/theme-provider";

import "./globals.css";

/** Editorial masthead voice — opsz keeps the display cut sharp at hero sizes. */
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

/** Newspaper-derived grotesque: quieter than Inter, still neutral under long reads. */
const schibsted = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

/** Data rails, kickers, and every figure that must line up in a column. */
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const metadataBase = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.URL ??
    "http://localhost:3000",
);
const title = "Berat Ercevik - Software Engineer";
const description =
  "Software engineering portfolio featuring full-stack applications, agentic systems, and AI research by Berat Ercevik.";
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
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: {
    index: true,
    follow: true,
  },
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
      className={`${newsreader.variable} ${schibsted.variable} ${plexMono.variable}`}
    >
      <body className="flex min-h-dvh flex-col bg-background font-sans text-foreground antialiased">
        <ThemeProvider>{children}</ThemeProvider>
        {process.env.NODE_ENV === "development" ? (
          <Agentation endpoint="http://localhost:4747" />
        ) : null}
      </body>
    </html>
  );
}
