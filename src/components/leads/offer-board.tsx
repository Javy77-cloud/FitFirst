import Link from "next/link";
import { AwardLeadForm } from "@/components/leads/award-form";
import type { LeadOfferBulletinRow } from "@/lib/leads/offers";

/** Admin award strip. The home bot owns the full bulletin. */
export function UnassignedOfferBoard({
  offers,
  agents,
}: {
  offers: LeadOfferBulletinRow[];
  agents: { id: string; name: string }[];
}) {
  return (
    <section className="ff-card overflow-hidden" data-lead-offers="unassigned">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-navy">Unassigned inbound</h3>
        <p className="text-helper text-muted-foreground">
          Agency social / inbound Leads. Award to any agent. Home bulletin reads the same offer
          list.
        </p>
      </div>
      {offers.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          No unassigned social inbound right now.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {offers.map((offer) => (
            <li
              key={offer.id}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <Link href={`/leads/${offer.leadId}`} className="text-sm font-medium text-primary hover:underline">
                  {offer.leadName}
                </Link>
                <p className="text-caption uppercase tracking-wide text-muted-foreground">
                  {offer.platform ?? offer.source}
                  {offer.leadPhone ? ` · ${offer.leadPhone}` : ""}
                </p>
              </div>
              <AwardLeadForm leadId={offer.leadId} agents={agents} next="/social" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
