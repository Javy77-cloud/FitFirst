import Link from "next/link";
import { PipelineBookModeToggle } from "@/components/pipeline/book-mode-toggle";
import { RenewalsPulse } from "@/components/renewals/renewals-pulse";
import { RenewalsUrgencyBoard } from "@/components/renewals/renewals-urgency-board";
import { RENEWAL_QUEUE_DISCLAIMER } from "@/lib/domain-ams";
import type { RenewalBoardCard } from "@/lib/renewal/board-data";

export function RenewalsWorkspace({
  cards,
  notice,
  error,
}: {
  cards: RenewalBoardCard[];
  notice?: string;
  error?: string;
}) {
  return (
    <div className="space-y-3" data-ff-renewals-workspace="">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PipelineBookModeToggle mode="renewals" />
        <p className="text-sm text-muted-foreground">
          <Link href="/renewals/queue" className="text-primary hover:underline">
            Classic queue
          </Link>
          {" · "}
          <Link href="/book-health" className="text-primary hover:underline">
            Book health
          </Link>
        </p>
      </div>
      <p className="max-w-3xl text-sm text-muted-foreground">{RENEWAL_QUEUE_DISCLAIMER}</p>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {notice === "reminder_set" ? (
        <p className="text-sm text-navy">Cross-sell reminder task created.</p>
      ) : null}
      {notice === "template_queued" ? (
        <p className="text-sm text-navy">
          Email template queued on the outbound stub — nothing sent.
        </p>
      ) : null}
      <RenewalsPulse daysUntil={cards.map((card) => card.daysUntil)} />
      <RenewalsUrgencyBoard cards={cards} />
    </div>
  );
}
