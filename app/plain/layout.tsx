import type { Metadata } from "next";

import { MotionPreferenceProvider } from "@/components/providers/motion-provider";

export const metadata: Metadata = {
  title: "Berat Ercevik - Software Engineer (no animations)",
  robots: { index: false, follow: true },
  alternates: { canonical: "/" },
};

export default function PlainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <MotionPreferenceProvider forceReduce>{children}</MotionPreferenceProvider>
  );
}
