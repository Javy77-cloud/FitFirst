import { Handshake } from "lucide-react";
import { awardLeadOffer, claimLeadOffer, postLeadOffer } from "@/app/actions/home-dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { HomeAgentOption, HomeLeadOfferView } from "@/lib/db/queries";
import { canAwardOffer, canClaimOffer, offerStatusLabel } from "@/lib/home/lead-offers";

export function LeadOfferBoard({
  offers,
  agents,
  isAdmin,
  currentUserId,
}: {
  offers: HomeLeadOfferView[];
  agents: HomeAgentOption[];
  isAdmin: boolean;
  currentUserId: string | null;
}) {
  return (
    <section className="ff-card overflow-hidden">
      <div className="border-b border-border px-4 py-3">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-navy">
          <Handshake className="size-3.5 text-fit-flag" />
          Management lead offers
        </h3>
        <p className="text-[11px] text-muted-foreground">
          Desk-wide. Admin posts a lead that needs a language or license. Agents claim it. Admin awards it.
          Does not create a new person.
        </p>
      </div>
      {offers.length === 0 ? (
        <p className="px-4 py-5 text-sm text-muted-foreground">No open or recent offers.</p>
      ) : (
        <ul className="divide-y divide-border">
          {offers.map((offer) => {
            const claimed = offer.claims.some((claim) => claim.agentId === currentUserId);
            return (
              <li key={offer.id} className="px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-navy">{offer.title}</div>
                    <p className="mt-1 text-[13px] text-muted-foreground">{offer.details}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Posted by {offer.postedByName}
                      {offer.language ? ` · ${offer.language}` : ""}
                      {offer.state ? ` · ${offer.state}` : ""}
                      {" · "}
                      {offerStatusLabel(offer.status)}
                      {offer.awardedToName ? ` to ${offer.awardedToName}` : ""}
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
                        <span className="text-muted-foreground"> wants it</span>
                        {claim.note ? <span className="text-muted-foreground"> — {claim.note}</span> : null}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  {canClaimOffer(offer.status, claimed) && currentUserId ? (
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
                  {isAdmin && canAwardOffer(offer.status) ? (
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
        <form action={postLeadOffer} className="space-y-2 border-t border-border px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Post a lead offer
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="offer-title" className="text-xs">
                Title
              </Label>
              <Input
                id="offer-title"
                name="title"
                required
                className="mt-1 h-8"
                placeholder="Lead in Montana — anyone licensed?"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="offer-details" className="text-xs">
                Details
              </Label>
              <Textarea
                id="offer-details"
                name="details"
                required
                rows={2}
                className="mt-1"
                placeholder="I have a lead that speaks French — anyone want it?"
              />
            </div>
            <div>
              <Label htmlFor="offer-language" className="text-xs">
                Language
              </Label>
              <Input id="offer-language" name="language" className="mt-1 h-8" placeholder="French" />
            </div>
            <div>
              <Label htmlFor="offer-state" className="text-xs">
                State
              </Label>
              <Input id="offer-state" name="state" className="mt-1 h-8" placeholder="MT" />
            </div>
          </div>
          <Button type="submit" size="sm">
            Post offer
          </Button>
        </form>
      ) : null}
    </section>
  );
}
