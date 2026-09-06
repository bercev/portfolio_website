import { Agentation } from "agentation";
import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";

import { ThemeProvider } from "@/components/providers/theme-provider";

import "./globals.css";

/** One family for the whole page. Hierarchy comes from weight and size. */
const grotesk = Bricolage_Grotesque({
  variable: "--font-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
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
      className={grotesk.variable}
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
