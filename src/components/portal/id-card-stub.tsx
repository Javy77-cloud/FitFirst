import type { IdCardStub } from "@/lib/portal/id-card";

export function IdCardStubView({ card }: { card: IdCardStub }) {
  return (
    <article className="overflow-hidden rounded-xl border-2 border-navy bg-card shadow-sm">
      <header className="flex items-start justify-between gap-3 bg-navy px-4 py-3 text-white">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
            Insurance ID card
          </p>
          <h3 className="text-lg font-semibold">{card.agencyName}</h3>
        </div>
        <p className="text-right text-xs text-white/80">{card.agencyPhone}</p>
      </header>
      <div className="grid gap-3 px-4 py-4 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Named insured
          </p>
          <p className="font-medium text-navy">{card.insuredName}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Policy
          </p>
          <p className="font-mono text-sm font-medium text-navy">{card.policyNumber}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Carrier / line
          </p>
          <p className="text-sm">
            {card.carrierName} · {card.lineLabel}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Term
          </p>
          <p className="text-sm">
            {card.effectiveDate} to {card.expirationDate}
          </p>
        </div>
      </div>
      <footer className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
        Desk stub for wallet or lender copy. Not a carrier-issued card and not emailed.
      </footer>
    </article>
  );
}
