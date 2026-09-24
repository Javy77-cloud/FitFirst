import type { Metadata } from "next";
import { cookies } from "next/headers";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";
import { ActionToastHost } from "@/components/desk/action-toast";
import { AppNotificationHost } from "@/components/desk/app-notification-host";
import { NavigationProgress } from "@/components/desk/navigation-progress";
import { SheetBoot } from "@/components/sheet/sheet-boot";
import { TitleTipHost } from "@/components/desk/title-tip-host";
import { SESSION_COOKIES } from "@/lib/auth/cookies";
import { verifySessionToken } from "@/lib/auth/signed-session";
import { preloadDeskShell } from "@/lib/desk/shell-preload";
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const claims = verifySessionToken(jar.get(SESSION_COOKIES.session)?.value);
  if (claims?.sub) {
    preloadDeskShell();
  }
  return (
    <html
      lang="en"
      className={`${plex.variable} ${plexMono.variable} h-full`}
      data-ff-user-id={claims?.sub ?? ""}
    >
      <body className="min-h-full">
        {children}
        <Suspense fallback={null}>
          <ActionToastHost />
        </Suspense>
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <AppNotificationHost />
        <SheetBoot />
        <TitleTipHost />
        <Script src="/ff-sheet.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
