import Link from "next/link";
import { AutomationsDeveloperFrame } from "@/components/automations/developer-frame";
import { requireSignedIn } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function AutomationsMacrosPage() {
  const session = await requireSignedIn();

  return (
    <AutomationsDeveloperFrame title="Macros" isAdmin={session.isAdmin}>
      <div className="ff-card max-w-2xl space-y-3 p-4">
        <p className="text-sm text-muted-foreground">
          Macros is owned by a sibling bot (see Custom Buttons / Macros bots). This tab is the
          same placeholder as Settings → Developer Hub → Macros so Automations is not empty.
        </p>
        <p className="text-sm">
          <Link href="/automations/functions" className="text-primary hover:underline">
            Use Functions
          </Link>
          {" · "}
          <Link href="/settings/developer/macros" className="text-primary hover:underline">
            Settings placeholder
          </Link>
        </p>
      </div>
    </AutomationsDeveloperFrame>
  );
}
