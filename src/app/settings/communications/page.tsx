import Link from "next/link";
import { saveCommunicationsSettings } from "@/app/actions/meetings";
import { AppShell } from "@/components/app-shell";
import { SettingsSubnav } from "@/components/templates/email-activity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { currentDeskSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getAgencySettings } from "@/lib/db/queries";
import { users } from "@/lib/db/schema";
import { ADMIN_USER_ID, AGENT_USER_ID } from "@/lib/fixtures/ids";
import { eq } from "drizzle-orm";
import { meetingActorId, VIDEO_PROVIDER_LABEL, VIDEO_PROVIDERS } from "@/lib/meetings/types";

export const dynamic = "force-dynamic";

export default async function CommunicationsSettingsPage() {
  const session = await currentDeskSession();
  const actorId = meetingActorId({
    userId: session.userId,
    isAdmin: session.isAdmin,
    adminUserId: ADMIN_USER_ID,
    agentUserId: AGENT_USER_ID,
  });
  const [actor, agency] = await Promise.all([
    db.select().from(users).where(eq(users.id, actorId)).then((rows) => rows[0] ?? null),
    getAgencySettings(),
  ]);
  const videoProvider =
    "videoProvider" in agency && typeof agency.videoProvider === "string" ? agency.videoProvider : "none";

  return (
    <AppShell title="Communications">
      <SettingsSubnav current="communications" />
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Video rooms and meeting addresses for pipeline appointments. Zoom / Google Meet / BYO are
        stubs — FitFirst does not OAuth or store vendor keys. In-Office meetings use the agency
        address plus your desk address. In-Home pulls the Deal / Lead street.
      </p>

      <form action={saveCommunicationsSettings} className="grid gap-4 xl:grid-cols-2 xl:items-start">
        <section className="ff-card space-y-3 p-4">
          <h2 className="text-sm font-semibold text-navy">Video providers</h2>
          <p className="text-xs text-muted-foreground">
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
            <Input
              name="officeAddress"
              defaultValue={"officeAddress" in agency ? (agency.officeAddress ?? "") : ""}
              className="mt-1 h-8"
              placeholder="2100 Palm Bay Rd NE, Palm Bay, FL 32905"
              disabled={!session.isAdmin}
            />
            {!session.isAdmin ? (
              <p className="mt-1 text-[11px] text-muted-foreground">Only Admin can edit the agency office.</p>
            ) : null}
          </div>
          <div>
            <Label className="text-xs">Your meeting address</Label>
            <Input
              name="meetingAddress"
              defaultValue={actor?.meetingAddress ?? session.user?.meetingAddress ?? ""}
              className="mt-1 h-8"
              placeholder="Suite 112 · same building"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Added to In-Office meetings for {session.name}. Agents edit only this line.
            </p>
          </div>
          <Button type="submit" size="sm">
            Save communications
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Pipeline cards use these values. Calendar still lists the meeting.{" "}
            <Link href="/pipeline?pipeline=p-c" className="text-primary hover:underline">
              Open pipeline
            </Link>
          </p>
        </section>
      </form>
    </AppShell>
  );
}
