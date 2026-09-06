import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import Script from "next/script";
import { SheetBoot } from "@/components/sheet/sheet-boot";
import "./globals.css";

const plex = IBM_Plex_Sans({
  variable: "--font-ibm-plex",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "FitFirst — P&C CRM + filter-first rater",
  description:
    "Lead to deal shopping, one Quote Sheet per line, Super-Copy for the rater, and filter-first carrier ranking.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plex.variable} ${plexMono.variable} h-full`}>
      <body className="min-h-full">
        {children}
        <SheetBoot />
        <Script src="/ff-sheet.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
