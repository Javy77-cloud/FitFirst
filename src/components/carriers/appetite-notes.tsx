/**
 * Legacy plain-text Appetite panel — replaced by StructuredAppetiteTable /
 * StructuredDontWriteTable on the carrier record. Kept as a thin stub so old
 * deep-links to ?notes= do not crash if CarriersTable is still mounted.
 */
import Link from "next/link";
import type { AppetiteNotesRule } from "@/components/carriers/appetite-notes-types";

export type { AppetiteNotesRule };

export function AppetiteNotesPanel({
  carrierName,
  closeHref,
  carrierId,
}: {
  carrierName: string;
  dontWriteNotes?: string | null;
  rule?: AppetiteNotesRule | null;
  appointments?: unknown;
  closeHref: string;
  carrierId?: string;
}) {
  return (
    <section className="ff-card space-y-2 p-4" data-ff-carrier-appetite-legacy="">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-sm font-semibold text-[#002868]">
          {carrierName} — Appetite &amp; Don&apos;t Write
        </h2>
        <Link href={closeHref} className="text-xs text-muted-foreground hover:underline">
          Close
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">
        Plain-text Appetite / Don&apos;t Write was replaced by structured rows on the carrier
        record (date, LOB, risk factors, accept/decline).
      </p>
      {carrierId ? (
        <Link
          href={`/carriers/${carrierId}`}
          className="inline-flex text-sm font-medium text-[#002868] hover:underline"
        >
          Open Carrier Record
        </Link>
      ) : null}
    </section>
  );
}
