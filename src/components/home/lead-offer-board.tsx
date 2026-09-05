import Link from "next/link";
import { Handshake } from "lucide-react";
import { awardLeadOffer, claimLeadOffer, postLeadOffer, takeOwnershipLeadOffer } from "@/app/actions/home-dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { HomeAgentOption, HomeLeadOfferView } from "@/lib/db/queries";
import {
  canAwardOffer,
  canClaimOffer,
  canTakeOwnership,
  claimRelationLabel,
  offerStatusLabel,
} from "@/lib/home/lead-offers";

export function LeadOfferBoard({
  offers,
  agents,
  isAdmin,
  currentUserId,
  embedded = false,
}: {
  offers: HomeLeadOfferView[];
  agents: HomeAgentOption[];
  isAdmin: boolean;
  currentUserId: string | null;
  embedded?: boolean;
}) {
  return (
    <section className={embedded ? "overflow-hidden" : "ff-card overflow-hidden"}>
      <div className="border-b border-border px-4 py-3">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-navy">
          <Handshake className="size-3.5 text-fit-flag" />
          Management lead offers
        </h3>
        <p className="text-[11px] text-muted-foreground">
          Desk-wide. Referral: agents raise a hand, Admin awards. Inbound email or a routing miss:
          take ownership and the Lead. Unassigned routing posts here when no territory / line /
          capacity match.
        </p>
      </div>
      {offers.length === 0 ? (
        <p className="px-4 py-5 text-sm text-muted-foreground">No open or recent offers.</p>
      ) : (
        <ul className="divide-y divide-border">
          {offers.map((offer) => {
            const claimed = offer.claims.some((claim) => claim.agentId === currentUserId);
            const inbound = offer.kind === "inbound_email";
            return (
              <li key={offer.id} className="px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-navy">{offer.title}</div>
                    <p className="mt-1 text-[13px] text-muted-foreground">{offer.details}</p>
                    {inbound ? (
                      <div className="mt-2 space-y-0.5 text-[12px] text-navy">
                        {offer.emailFrom ? <p>From {offer.emailFrom}</p> : null}
                        {offer.emailSubject ? <p>Subject: {offer.emailSubject}</p> : null}
                        {offer.emailSnippet ? (
                          <p className="text-muted-foreground">{offer.emailSnippet}</p>
                        ) : null}
                        {offer.emailStubId ? (
                          <p className="text-muted-foreground">Stub {offer.emailStubId}</p>
                        ) : null}
                      </div>
                    ) : null}
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {offer.kind === "inbound_email"
                        ? "Inbound email"
                        : offer.kind === "unassigned"
                          ? "Routing miss"
                          : "Referral"}{" "}
                      · Posted by {offer.postedByName}
                      {offer.language ? ` · ${offer.language}` : ""}
                      {offer.state ? ` · ${offer.state}` : ""}
                      {" · "}
                      {offerStatusLabel(offer.status)}
                      {offer.claimedByName ? ` by ${offer.claimedByName}` : ""}
                      {offer.awardedToName ? ` to ${offer.awardedToName}` : ""}
                      {offer.leadId ? (
                        <>
                          {" · "}
                          <Link href={`/leads/${offer.leadId}`} className="text-fit-blue underline">
                            Open lead
                          </Link>
                        </>
                      ) : null}
                    </p>
                  </div>
                </div>
                {offer.claims.length === 0 ? (
                  <p className="mt-2 text-[12px] text-muted-foreground">Nobody has claimed this yet.</p>
                ) : (
                  <ul className="mt-2 space-y-1 text-[12px]">
                    {offer.claims.map((claim) => (
                      <li key={claim.agentId} className="text-navy">
                        <span className="font-medium">{claim.name}</span>
                        <span className="text-muted-foreground">
                          {inbound ? " claimed it" : " wants it"}
                          {claimRelationLabel(claim.relation)
                            ? ` — ${claimRelationLabel(claim.relation)}`
                            : ""}
                        </span>
                        {claim.note ? <span className="text-muted-foreground"> — {claim.note}</span> : null}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  {canTakeOwnership(offer.status, offer.kind) && currentUserId ? (
                    <form action={takeOwnershipLeadOffer} className="flex flex-wrap items-end gap-3">
                      <input type="hidden" name="offerId" value={offer.id} />
                      <fieldset className="space-y-1">
                        <legend className="text-xs font-medium">Claim as</legend>
                        <label className="flex items-center gap-1.5 text-[12px]">
                          <input type="radio" name="relation" value="know_client" />
                          I know this client
                        </label>
                        <label className="flex items-center gap-1.5 text-[12px]">
                          <input type="radio" name="relation" value="new_lead" defaultChecked />
                          New lead
                        </label>
                      </fieldset>
                      <div>
                        <Label htmlFor={`own-note-${offer.id}`} className="text-xs">
                          Note
                        </Label>
                        <Input
                          id={`own-note-${offer.id}`}
                          name="note"
                          className="mt-1 h-8 w-56"
                          placeholder="Optional"
                        />
                      </div>
                      <Button type="submit" size="sm">
                        Take ownership
                      </Button>
                    </form>
                  ) : null}
                  {canClaimOffer(offer.status, claimed, offer.kind) && currentUserId ? (
                    <form action={claimLeadOffer} className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="offerId" value={offer.id} />
                      <div>
                        <Label htmlFor={`claim-note-${offer.id}`} className="text-xs">
                          Note
                        </Label>
                        <Input
                          id={`claim-note-${offer.id}`}
                          name="note"
                          className="mt-1 h-8 w-56"
                          placeholder="I speak French / licensed in MT"
                        />
                      </div>
                      <Button type="submit" size="sm">
                        I want this lead
                      </Button>
                    </form>
                  ) : null}
                  {claimed && offer.status === "open" ? (
                    <p className="text-[12px] font-medium text-fit-green">You claimed this. Waiting on Admin.</p>
                  ) : null}
                  {offer.status === "claimed" && offer.claimedByName ? (
                    <p className="text-[12px] font-medium text-fit-green">
                      Claimed by {offer.claimedByName}
                    </p>
                  ) : null}
                  {isAdmin && canAwardOffer(offer.status, offer.kind) ? (
                    <form action={awardLeadOffer} className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="offerId" value={offer.id} />
                      <div>
                        <Label className="text-xs">Award to</Label>
                        <select
                          name="agentId"
                          required
                          className="mt-1 h-8 rounded-md border border-input bg-card px-2 text-sm"
                          defaultValue={offer.claims[0]?.agentId ?? ""}
                        >
                          <option value="" disabled>
                            Pick an agent
                          </option>
                          {agents.map((agent) => (
                            <option key={agent.id} value={agent.id}>
                              {agent.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Button type="submit" size="sm" variant="outline">
                        Award lead
                      </Button>
                    </form>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {isAdmin ? (
        <div className="border-t border-border px-4 py-3">
          <form action={postLeadOffer} className="space-y-2">
            <input type="hidden" name="kind" value="inbound_email" />
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Share inbound email
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="email-from" className="text-xs">
                  From
                </Label>
                <Input
                  id="email-from"
                  name="emailFrom"
                  className="mt-1 h-8"
                  placeholder="Renee Colbert <renee.colbert@inbox.local>"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="email-subject" className="text-xs">
                  Subject
                </Label>
                <Input id="email-subject" name="emailSubject" className="mt-1 h-8" placeholder="HO quote" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="email-snippet" className="text-xs">
                  Snippet
                </Label>
                <Textarea
                  id="email-snippet"
                  name="emailSnippet"
                  rows={2}
                  className="mt-1"
                  placeholder="First lines of the inquiry"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="email-body" className="text-xs">
                  Full body (optional)
                </Label>
                <Textarea id="email-body" name="emailBody" rows={3} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="email-stub" className="text-xs">
                  Email stub id
                </Label>
                <Input id="email-stub" name="emailStubId" className="mt-1 h-8" placeholder="inbox-stub-…" />
              </div>
              <div>
                <Label htmlFor="email-language" className="text-xs">
                  Language
                </Label>
                <Input id="email-language" name="language" className="mt-1 h-8" placeholder="English" />
              </div>
              <div>
                <Label htmlFor="email-state" className="text-xs">
                  State / license
                </Label>
                <Input id="email-state" name="state" className="mt-1 h-8" placeholder="FL" />
              </div>
            </div>
            <Button type="submit" size="sm">
              Share on board
            </Button>
          </form>
        </div>
      ) : null}
    </section>
  );
}
