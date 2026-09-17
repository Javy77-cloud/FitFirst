import Link from "next/link";
import { eq } from "drizzle-orm";
import { saveCommunicationsSettings } from "@/app/actions/meetings";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { SettingsShell } from "@/components/settings/settings-shell";
import { ConnectionBadge } from "@/components/settings/connection-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { currentDeskSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getAgencySettings } from "@/lib/db/queries";
import { users } from "@/lib/db/schema";
import { ADMIN_USER_ID, AGENT_USER_ID } from "@/lib/fixtures/ids";
import { listCatalogItems } from "@/lib/integrations/catalog-store";
import type { IntegrationCategory } from "@/lib/integrations/catalog";
import { meetingActorId, VIDEO_PROVIDER_LABEL, VIDEO_PROVIDERS } from "@/lib/meetings/types";

export const dynamic = "force-dynamic";

const CHANNELS: {
  id: IntegrationCategory | "email";
  href: string;
  title: string;
  body: string;
  categories: IntegrationCategory[];
}[] = [
  {
    id: "email",
    href: "/settings/email",
    title: "Email",
    body: "Gmail and Yahoo are BYO OAuth. Outlook / Zoho stay unwired. Templates stay under Brand / lists.",
    categories: ["email"],
  },
  {
    id: "phone_sms",
    href: "/settings/sms",
    title: "SMS",
    body: "Twilio or RingCentral text. Campaigns still log would_send. Nothing texts a client.",
    categories: ["phone_sms"],
  },
  {
    id: "phone_sms",
    href: "/settings/phone",
    title: "Phone",
    body: "Call log on the desk. Admin marks the agency-paid trunk. No softphone.",
    categories: ["phone_sms"],
  },
  {
    id: "video",
    href: "/settings/video",
    title: "Video",
    body: "Google Meet helper is on Calendar when Calendar or Meet is connected. Zoom stays stub.",
    categories: ["video"],
  },
];

export default async function CommunicationsSettingsPage() {
  const session = await currentDeskSession();
  const actorId = meetingActorId({
    userId: session.userId,
    isAdmin: session.isAdmin,
    adminUserId: ADMIN_USER_ID,
    agentUserId: AGENT_USER_ID,
  });
  const [items, actor, agency] = await Promise.all([
    listCatalogItems(),
    db.select().from(users).where(eq(users.id, actorId)).then((rows) => rows[0] ?? null),
    getAgencySettings(),
  ]);
  const videoProvider =
    "videoProvider" in agency && typeof agency.videoProvider === "string" ? agency.videoProvider : "none";

  return (
    <SettingsShell title="Communications" current="communications">
      <p className="mb-4 text-sm text-muted-foreground">
        Email, SMS, phone, and video. Each channel is bring-your-own — the agency pays the
        vendor. Open Integrations to connect the catalog.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {CHANNELS.map((channel) => {
          const related = items.filter((item) => channel.categories.includes(item.category));
          const connected = related.filter((item) => item.connected).length;
          return (
            <Link
              key={`${channel.title}-${channel.href}`}
              href={channel.href}
              className="ff-card block p-4 hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-sm font-semibold text-navy">{channel.title}</h2>
                <ConnectionBadge connected={connected > 0} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{channel.body}</p>
              <p className="mt-2 text-helper text-muted-foreground">
                {connected} of {related.length} providers connected
              </p>
            </Link>
          );
        })}
      </div>
      <p className="mt-4 text-sm">
        <Link href="/settings/outbound" className="text-primary hover:underline">
          Outbound email / SMS queue
        </Link>
        <span className="mx-2 text-muted-foreground">·</span>
        <Link href="/settings/integrations" className="text-primary hover:underline">
          Open the Integrations catalog
        </Link>
      </p>

      <form action={saveCommunicationsSettings} className="mt-6 grid gap-4 xl:grid-cols-2 xl:items-start">
        <section className="ff-card space-y-3 p-4">
          <h2 className="text-sm font-semibold text-navy">Meeting rooms</h2>
          <p className="text-helper text-muted-foreground">
            {session.isAdmin
              ? "Paste the room links the desk should open. Preferred provider is used first."
              : "Admin connects the rooms. You can still open whatever link is saved."}
          </p>
          <fieldset disabled={!session.isAdmin} className="space-y-3">
            <div>
              <Label className="text-xs">Preferred provider</Label>
              <select
                name="videoProvider"
                defaultValue={videoProvider}
                className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
              >
                <option value="none">None yet</option>
                {VIDEO_PROVIDERS.map((provider) => (
                  <option key={provider} value={provider}>
                    {VIDEO_PROVIDER_LABEL[provider]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Zoom link</Label>
              <Input
                name="zoomUrl"
                defaultValue={"zoomUrl" in agency ? (agency.zoomUrl ?? "") : ""}
                className="mt-1 h-8"
                placeholder="https://zoom.us/j/…"
              />
            </div>
            <div>
              <Label className="text-xs">Google Meet link</Label>
              <Input
                name="meetUrl"
                defaultValue={"meetUrl" in agency ? (agency.meetUrl ?? "") : ""}
                className="mt-1 h-8"
                placeholder="https://meet.google.com/…"
              />
            </div>
            <div>
              <Label className="text-xs">BYO video link</Label>
              <Input
                name="byoVideoUrl"
                defaultValue={"byoVideoUrl" in agency ? (agency.byoVideoUrl ?? "") : ""}
                className="mt-1 h-8"
                placeholder="https://teams.microsoft.com/…"
              />
            </div>
          </fieldset>
        </section>

        <section className="ff-card space-y-3 p-4">
          <h2 className="text-sm font-semibold text-navy">Meeting addresses</h2>
          <div>
            <Label className="text-xs">Agency office (In-Office)</Label>
            <AddressAutocomplete
              name="officeAddress"
              defaultValue={"officeAddress" in agency ? (agency.officeAddress ?? "") : ""}
              className="mt-1 h-8"
              placeholder="2100 Palm Bay Rd NE, Palm Bay, FL 32905"
              disabled={!session.isAdmin}
              composeOnConfirm
            />
            {!session.isAdmin ? (
              <p className="mt-1 text-helper text-muted-foreground">Only Admin can edit the agency office.</p>
            ) : null}
          </div>
          <div>
            <Label className="text-xs">Your meeting address</Label>
            <AddressAutocomplete
              name="meetingAddress"
              defaultValue={actor?.meetingAddress ?? session.user?.meetingAddress ?? ""}
              className="mt-1 h-8"
              placeholder="Suite 112 · same building"
              composeOnConfirm
            />
            <p className="mt-1 text-helper text-muted-foreground">
              Added to In-Office meetings for {session.name}. Agents edit only this line.
            </p>
          </div>
          <Button type="submit" size="sm">
            Save communications
          </Button>
          <p className="text-helper text-muted-foreground">
            Deal cards use these values. Calendar still lists the meeting.{" "}
            <Link href="/deals?view=board&pipeline=p-c" className="text-primary hover:underline">
              Open Deals board
            </Link>
          </p>
        </section>
      </form>
    </SettingsShell>
  );
}
