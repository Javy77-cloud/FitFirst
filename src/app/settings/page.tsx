import { AppShell } from "@/components/app-shell";
import { SettingsAccordion } from "@/components/settings/settings-accordion";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const { section } = await searchParams;
  return (
    <AppShell title="Settings" eyebrow="Desk">
      <div className="max-w-xl">
        <p className="mb-3 text-base text-muted-foreground">
          One section open at a time. Phone, agency profile, and notifications stay on this desk.
        </p>
        <SettingsAccordion initial={section ?? "phone"} />
      </div>
    </AppShell>
  );
}
