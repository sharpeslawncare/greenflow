import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "GreenFlow",
  description: "Professional lawn care operations platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}