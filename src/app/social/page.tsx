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
      routeLabel: session.isAdmin
        ? ownerId
          ? `${names.get(ownerId) ?? "Agent"}'s connected account`
          : "Agency · Admin awards"
        : ownerId
          ? names.get(ownerId) ?? "Assigned"
          : "Agency award pool",
    };
  });

  return (
    <AppShell
      title="Social"
      actions={
        session.isAdmin ? (
          <Link href="/settings/social" className={cn(buttonVariants({ variant: "outline" }))}>
            Social settings
          </Link>
        ) : undefined
      }
    >

      {notice === "no-new-inquiries" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          Visible inquiries already have Lead records (matched by name plus email or phone).
        </p>
      ) : null}
      {notice === "awarded" ? (
        <p className="mb-3 rounded-md border border-[var(--ff-green)]/30 bg-[var(--ff-green-bg)] px-3 py-2 text-sm">
          Lead awarded. That agent got an in-app ping.
        </p>
      ) : null}

      {session.isAdmin ? (
        <div className="grid gap-3 md:grid-cols-2">
          {social.map((item) => (
            <SocialByoCard
              key={item.id}
              item={item}
              canEdit
              returnTo="/settings/social"
            />
          ))}
        </div>
      ) : null}
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
