import { IN_DESK_ESIGN_LABEL } from "@/lib/esign/in-desk";

export function InDeskEsignBanner({ children }: { children?: React.ReactNode }) {
  return (
    <div className="mb-3 rounded-md border border-dashed border-border bg-fit-check-bg px-3 py-2 text-sm text-navy">
      <p className="font-semibold">{IN_DESK_ESIGN_LABEL}</p>
      <p className="mt-1 text-muted-foreground">
        {children ??
          "Draw or type a name in FitFirst. Finish-line DocuSign stays parked. No paid e-sign vendor SDK."}
      </p>
    </div>
  );
}
