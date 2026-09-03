import { CLAIMS_DESK_COPY } from "@/lib/claims";

export function ClaimsDeskNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div className="rounded-md border border-fit-flag/30 bg-fit-flag-bg px-3 py-2 text-sm text-navy">
      <p className="font-medium">Broker log only</p>
      <p className={compact ? "text-xs text-muted-foreground" : "text-sm text-muted-foreground"}>
        {CLAIMS_DESK_COPY}
      </p>
    </div>
  );
}
