import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { UnassignedOfferBoard } from "@/components/leads/offer-board";
import { InquiryList } from "@/components/social/inquiry-list";
import { PulseCards } from "@/components/social/pulse-cards";
import { buttonVariants } from "@/components/ui/button";
import { requireSignedIn } from "@/lib/auth/guards";
import { listCatalogItems } from "@/lib/integrations/catalog-store";
import { connectionOwnerFor, listAwardableAgents, listOpenLeadOffers } from "@/lib/leads/offers";
import { loadSocialPulse } from "@/lib/social/store";
import { listUsers } from "@/lib/db/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SocialPulsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSignedIn();
  const role = session.isAdmin ? "admin" : "agent";
  const [pulse, query, items, users, offers, agents] = await Promise.all([
    loadSocialPulse(role),
    searchParams,
    listCatalogItems(),
    listUsers(),
    session.isAdmin ? listOpenLeadOffers() : Promise.resolve([]),
    session.isAdmin ? listAwardableAgents() : Promise.resolve([]),
  ]);
  const notice = typeof query.notice === "string" ? query.notice : undefined;
  const names = new Map(users.map((user) => [user.id, user.name]));
  const inquiries = pulse.inquiries.map((inquiry) => {
    const ownerId = connectionOwnerFor(
      inquiry.platform,
      items.map((item) => ({ id: item.id, ownerUserId: item.ownerUserId })),
    );
    return {
      ...inquiry,
      routeLabel: ownerId
        ? `${names.get(ownerId) ?? "Agent"}'s connected account`
        : "Agency · Admin awards",
    };
  });

  return (
    <AppShell
      title="Social pulse"
      actions={
        <Link href="/settings/social" className={cn(buttonVariants({ variant: "outline" }))}>
          {session.isAdmin ? "Connect accounts" : "View connections"}
        </Link>
      }
    >
      <p className="mb-3 max-w-3xl text-sm text-muted-foreground">
        Followers, engagement, and views for connected stubs. An inquiry on an agent&apos;s
        connected account creates a Lead and pings that agent. Agency inbound stays unassigned
        until Admin awards it. GBP stays Admin-gated.
      </p>
      {notice === "gbp-locked" ? (
        <p className="mb-3 rounded-md border border-border bg-fit-flag-bg px-3 py-2 text-sm">
          Google Business Profile stays locked until Admin allows agents to monitor it.
        </p>
      ) : null}
      {notice === "platform-disconnected" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          That platform is not connected. Ask Admin to click Connect on Settings → Integrations.
        </p>
      ) : null}
      {notice === "no-new-inquiries" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          Visible inquiries already have Lead records (matched by name plus email or phone).
        </p>
      ) : null}
      {notice === "unassigned-queued" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          That inbound is agency-level. Admin will award it to an agent — you were not assigned.
        </p>
      ) : null}
      {notice === "awarded" ? (
        <p className="mb-3 rounded-md border border-[var(--ff-green)]/30 bg-[var(--ff-green-bg)] px-3 py-2 text-sm">
          Lead awarded. That agent got an in-app ping.
        </p>
      ) : null}
      {pulse.gbpLocked ? (
        <p className="mb-3 rounded-md border border-border bg-secondary/60 px-3 py-2 text-sm">
          GBP is locked on this desk. Admin must toggle “Allow agents to monitor GBP” in Settings →
          Social after connecting the listing.
        </p>
      ) : null}

      <PulseCards cards={pulse.cards} />
      {session.isAdmin ? (
        <div className="mt-4">
          <UnassignedOfferBoard offers={offers} agents={agents} />
        </div>
      ) : null}
      <div className="mt-4">
        <InquiryList inquiries={inquiries} />
      </div>
    </AppShell>
  );
}
