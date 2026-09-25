import { IN_DESK_ESIGN_LABEL } from "@/lib/esign/in-desk";

export function InDeskEsignBanner() {
  return (
    <div className="mb-3 rounded-md border border-dashed border-border bg-fit-check-bg px-3 py-2 text-sm text-navy">
      <p className="font-semibold">{IN_DESK_ESIGN_LABEL}</p>

    </div>
  );
}
