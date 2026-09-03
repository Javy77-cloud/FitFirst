import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ClickToCall } from "@/components/click-to-call";
import { ELENA_CONTACT_ID } from "@/lib/fixtures/ids";

export const dynamic = "force-dynamic";

export default function PhonePage() {
  return (
    <AppShell title="Phone">
      <p className="mb-3 text-sm text-muted-foreground">
        Softphone stub. Click-to-call writes an in-app Alerts ping only — no email, no trunk.
        Log duration and outcome on Contact or Policy 360.
      </p>
      <div className="ff-card max-w-xl space-y-3 p-4 text-sm">
        <div className="font-medium text-navy">Desk click-to-call</div>
        <p className="text-muted-foreground">
          Elena Ruiz · (321) 555-0188. Submit writes an Alerts row. Nothing leaves the desk.
        </p>
        <ClickToCall
          entityType="contact"
          entityId={ELENA_CONTACT_ID}
          name="Elena Ruiz"
          phone="(321) 555-0188"
        />
        <p>
          Or open{" "}
          <Link href="/contacts" className="text-primary hover:underline">
            Contact 360
          </Link>{" "}
          and use the same button next to the phone.
        </p>
      </div>
    </AppShell>
  );
}
