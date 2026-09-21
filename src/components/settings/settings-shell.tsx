import type { ReactNode } from "react";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { DeskPageTrail } from "@/components/desk/desk-page-trail";
import { SettingsNav } from "@/components/settings/settings-nav";
import { SettingsScrollPreserve } from "@/components/settings/settings-scroll-preserve";
import { currentDeskSession } from "@/lib/auth/session";
import type { SettingsNavId } from "@/lib/settings/nav";
import { sessionMayUseMacros } from "@/lib/settings/agent-feature-toggles-prefs";

export async function SettingsShell({
  title,
  current = "overview",
  children,
  actions,
  eyebrow = "Settings",
  allowMfaPending = false,
}: {
  title: string;
  current?: SettingsNavId;
  children: ReactNode;
  actions?: ReactNode;
  eyebrow?: string;
  allowMfaPending?: boolean;
}) {
  const session = await currentDeskSession();
  const showMacros = current === "overview" ? true : await sessionMayUseMacros(session);

  return (
    <AppShell title={title} eyebrow={eyebrow} actions={actions} allowMfaPending={allowMfaPending}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {current === "overview" ? null : <SettingsNav current={current} showMacros={showMacros} />}
        <div className="min-w-0 flex-1">
          {current !== "overview" ? (
            <DeskPageTrail
              fallbackHref="/settings"
              crumbs={[
                { href: "/settings", label: "Settings" },
                { label: title },
              ]}
            />
          ) : null}
          <Suspense fallback={children}>
            <SettingsScrollPreserve>{children}</SettingsScrollPreserve>
          </Suspense>
        </div>
      </div>
    </AppShell>
  );
}
