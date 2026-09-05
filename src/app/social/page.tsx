import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { UnassignedOfferBoard } from "@/components/leads/offer-board";
import { InquiryList } from "@/components/social/inquiry-list";
import { SocialByoCard } from "@/components/social/social-byo-card";
import { buttonVariants } from "@/components/ui/button";
import { requireSignedIn } from "@/lib/auth/guards";
import { listCatalogByCategory } from "@/lib/integrations/catalog-store";
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
  const [pulse, query, groups, users, offers, agents] = await Promise.all([
    loadSocialPulse(role),
    searchParams,
    listCatalogByCategory(),
    listUsers(),
    session.isAdmin ? listOpenLeadOffers() : Promise.resolve([]),
    session.isAdmin ? listAwardableAgents() : Promise.resolve([]),
  ]);
  const notice = typeof query.notice === "string" ? query.notice : undefined;
  const names = new Map(users.map((user) => [user.id, user.name]));
  const social = groups.find((group) => group.category === "social")?.items ?? [];
  const inquiries = pulse.inquiries.map((inquiry) => {
    const ownerId = connectionOwnerFor(
      inquiry.platform,
      social.map((item) => ({ id: item.id, ownerUserId: item.ownerUserId })),
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
      title="Social"
      actions={
        <Link href="/settings/social" className={cn(buttonVariants({ variant: "outline" }))}>
          {session.isAdmin ? "Social settings" : "View connections"}
        </Link>
      }
    >
      <p className="mb-3 max-w-3xl text-sm text-muted-foreground">
        Connect the agency’s Meta, Google, or LinkedIn app. FitFirst does not buy those APIs or
        invent follower counts. Inquiries on a connected account become Leads. X stays a paid
        wall.
      </p>
      {notice === "gbp-locked" ? (
        <p className="mb-3 rounded-md border border-border bg-fit-flag-bg px-3 py-2 text-sm">
          Google Business Profile stays locked until Admin allows agents to monitor it.
        </p>
      ) : null}
      {notice === "platform-disconnected" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          That platform is not connected. Ask Admin to connect it under Settings → Social.
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
          GBP is locked on this desk. Admin must allow agents to monitor it in Settings → Social
          after connecting the listing.
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {social.map((item) => (
          <SocialByoCard
            key={item.id}
            item={item}
            canEdit={session.isAdmin}
            returnTo="/settings/social"
          />
        ))}
      </div>
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
