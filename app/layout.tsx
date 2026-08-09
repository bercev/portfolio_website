import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import { ScrollProgress } from "@/components/effects/scroll-progress";
import { BackToTop } from "@/components/effects/back-to-top";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Berat Ercevik — Software Engineer",
  description:
    "Berat Ercevik — software engineer building full-stack applications, agentic systems, and AI research. B.S. Computer Science @ UC Santa Cruz (2026).",
  openGraph: {
    title: "Berat Ercevik — Software Engineer",
    description:
      "Full-stack applications, agentic systems, and AI research. UC Santa Cruz CS (2026).",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f7fc" },
    { media: "(prefers-color-scheme: dark)", color: "#141d2b" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-full antialiased`}>
        <Providers>
          <SiteHeader />
          <ScrollProgress />
          <BackToTop />
          {children}
        </Providers>
      </body>
    </html>
  );
}
