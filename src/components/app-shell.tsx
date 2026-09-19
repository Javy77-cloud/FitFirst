import type { ReactNode } from "react";
import { PendingLink } from "@/components/desk/pending-link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { DeskHeader } from "@/components/desk-header";
import { DeskSidebar } from "@/components/desk-sidebar";
import { flattenResolvedNav, resolveNavLayout } from "@/lib/desk/nav-layout";
import { getStoredNavLayout } from "@/lib/db/nav-prefs";
import { loadHeaderNotificationState } from "@/lib/db/header-alerts";
import { SupportLauncher } from "@/components/support/help-center";
import { SupportProvider } from "@/components/support/support-context";
import { currentDeskSession, getActor, type DeskSession } from "@/lib/auth/session";
import type { Actor } from "@/lib/auth/rbac";
import type { HeaderRecordContext } from "@/lib/desk/header-record";
import { listUsers } from "@/lib/db/queries";
import { scheduleDueLeadFollowUpRelease } from "@/lib/leads/schedule-follow-up-release";
import { schedulePanelSignalSync } from "@/lib/notifications/sync-panel";
import { AgencyLobProvider } from "@/components/desk/agency-lob-context";
import { loadAgencyLobs } from "@/lib/db/line-settings";
import { ExperienceReviewHost } from "@/components/health/review-prompt-host";

export async function AppShell({
  children,
  title,
  eyebrow,
  actions,
  columns,
  allowMfaPending = false,
  utilityChrome = false,
  showBrand = true,
  hideHeaderTitle = false,
  recordContext,
}: {
  children: ReactNode;
  title: string;
  eyebrow?: string;
  actions?: ReactNode;
  columns?: ReactNode;
  allowMfaPending?: boolean;
  /** Lead + deal worksheet only: logo, search, notifications, profile. */
  utilityChrome?: boolean;
  /** Worksheet chrome can keep the logo off so the page title stands alone. */
  showBrand?: boolean;
  /** Deal detail: title lives in the page stack, not the utility header. */
  hideHeaderTitle?: boolean;
  /** Prefills the global Call / SMS / Email / Task composers next to profile. */
  recordContext?: HeaderRecordContext | null;
}) {
  scheduleDueLeadFollowUpRelease();
  schedulePanelSignalSync();
  const [session, actor, catalog] = await Promise.all([
    currentDeskSession(),
    getActor(),
    loadAgencyLobs().catch(() => []),
  ]);
  if (session.signedIn && session.mfaStatus === "challenge") redirect("/login/mfa");
  if (session.signedIn && session.mfaStatus === "pending" && !allowMfaPending) {
    redirect("/enroll-mfa");
  }

  return (
    <SupportProvider>
    <AgencyLobProvider catalog={catalog}>
      <div className="flex min-h-screen bg-background">
        <Suspense fallback={<aside className="hidden w-60 shrink-0 bg-sidebar md:block" aria-hidden />}>
          <AppShellSidebar session={session} actor={actor} />
        </Suspense>
        <div className="flex min-w-0 flex-1 flex-col">
          <Suspense fallback={null}>
            <AppShellMobileNav session={session} />
          </Suspense>
          <Suspense
            fallback={
              <DeskHeader
                title={title}
                eyebrow={eyebrow}
                actions={utilityChrome ? undefined : actions ?? columns}
                unread={0}
                alerts={[]}
                actor={actor}
                users={[]}
                signedIn={session.signedIn}
                canSwitchRole={session.canSwitchRole}
                impersonatorName={session.impersonatorName}
                isImpersonating={session.isImpersonating}
                utilityChrome={utilityChrome}
                showBrand={showBrand}
                hideHeaderTitle={hideHeaderTitle}
                recordContext={recordContext}
              />
            }
          >
            <AppShellHeader
              session={session}
              actor={actor}
              title={title}
              eyebrow={eyebrow}
              actions={utilityChrome ? undefined : actions ?? columns}
              utilityChrome={utilityChrome}
              showBrand={showBrand}
              hideHeaderTitle={hideHeaderTitle}
              recordContext={recordContext}
            />
          </Suspense>
          <main className="flex-1 px-2 py-5">{children}</main>
        </div>
        <Suspense fallback={null}>
          <ExperienceReviewHost />
        </Suspense>
        <Suspense fallback={null}>
          <SupportLauncher />
        </Suspense>
      </div>
    </AgencyLobProvider>
    </SupportProvider>
  );
}

async function AppShellSidebar({
  session,
  actor,
}: {
  session: DeskSession;
  actor: Actor;
}) {
  const [navLayout, header] = await Promise.all([
    getStoredNavLayout(session.userId, { isAdmin: session.isAdmin, isDeveloper: session.isDeveloper }),
    loadHeaderNotificationState().catch(() => ({ unread: 0, alerts: [] })),
  ]);
  return (
    <DeskSidebar
      unread={header.unread}
      actor={actor}
      signedIn={session.signedIn}
      isAdmin={session.isAdmin}
      isDeveloper={session.isDeveloper}
      initialLayout={navLayout}
    />
  );
}

async function AppShellMobileNav({ session }: { session: DeskSession }) {
  const navLayout = await getStoredNavLayout(session.userId, {
    isAdmin: session.isAdmin,
    isDeveloper: session.isDeveloper,
  });
  const mobileNav = flattenResolvedNav(
    resolveNavLayout(navLayout, { isAdmin: session.isAdmin, isDeveloper: session.isDeveloper }),
  );
  return (
    <nav className="ff-no-print flex gap-3 overflow-x-auto border-b border-border bg-card px-3 py-2 text-xs md:hidden">
      {mobileNav.map((item) => (
        <PendingLink key={`${item.id}-${item.href}`} href={item.href} className="whitespace-nowrap text-primary">
          {item.label}
        </PendingLink>
      ))}
    </nav>
  );
}

async function AppShellHeader({
  session,
  actor,
  title,
  eyebrow,
  actions,
  utilityChrome,
  showBrand,
  hideHeaderTitle,
  recordContext,
}: {
  session: DeskSession;
  actor: Actor;
  title: string;
  eyebrow?: string;
  actions?: ReactNode;
  utilityChrome: boolean;
  showBrand: boolean;
  hideHeaderTitle: boolean;
  recordContext?: HeaderRecordContext | null;
}) {
  const [userRows, header] = await Promise.all([
    listUsers().catch(() => []),
    loadHeaderNotificationState().catch(() => ({ unread: 0, alerts: [] })),
  ]);
  const users: Actor[] = userRows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email ?? "",
    role: row.role === "agent" || row.role === "developer" ? "agent" : "admin",
    profile: row.role === "developer" ? "developer" : row.role === "admin" ? "admin" : "agent",
  }));
  return (
    <DeskHeader
      title={title}
      eyebrow={eyebrow}
      actions={actions}
      unread={header.unread}
      alerts={header.alerts}
      actor={actor}
      users={users}
      signedIn={session.signedIn}
      canSwitchRole={session.canSwitchRole}
      impersonatorName={session.impersonatorName}
      isImpersonating={session.isImpersonating}
      utilityChrome={utilityChrome}
      showBrand={showBrand}
      hideHeaderTitle={hideHeaderTitle}
      recordContext={recordContext}
    />
  );
}
