import { setMacContinuity } from "@/app/actions/mac-continuity";
import { Button } from "@/components/ui/button";

export function MacContinuityToggle({
  enabled,
  canEdit,
}: {
  enabled: boolean;
  canEdit: boolean;
}) {
  return (
    <form
      action={setMacContinuity}
      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2"
      data-ff-mac-continuity=""
    >
      <div>
        <p className="text-sm font-semibold text-navy">Mac Continuity</p>
        <p className="text-helper text-muted-foreground">
          Use this Mac for Phone and SMS through Continuity, alongside the 8x8 provider.
        </p>
      </div>
      <input type="hidden" name="macContinuity" value={enabled ? "0" : "1"} />
      <Button type="submit" size="sm" variant={enabled ? "default" : "outline"} disabled={!canEdit}>
        {enabled ? "On" : "Off"}
      </Button>
    </form>
  );
}
