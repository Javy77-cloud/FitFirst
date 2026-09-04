import Link from "next/link";
import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default function PhonePage() {
  return (
    <AppShell title="Phone">
      <p className="mb-3 text-base text-muted-foreground">
        No in-desk softphone on this overnight boot. Agency-ops owns dialing. Calls on Contact
        and Policy are logged notes, not a live trunk.
      </p>
      <p className="text-sm">
        Use the activity form on a{" "}
        <Link href="/contacts" className="text-primary hover:underline">
          Contact
        </Link>{" "}
        or Policy 360 to log a call.
      </p>
    </AppShell>
  );
}
