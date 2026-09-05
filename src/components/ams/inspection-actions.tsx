import { advancePolicyInspection } from "@/app/actions/ams";
import { Button } from "@/components/ui/button";

export function InspectionActions({
  inspectionId,
  status,
  returnTo = "/inspections",
}: {
  inspectionId: string;
  status: string;
  returnTo?: string;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {status === "requested" ? (
        <form action={advancePolicyInspection}>
          <input type="hidden" name="inspectionId" value={inspectionId} />
          <input type="hidden" name="action" value="schedule" />
          <input type="hidden" name="returnTo" value={returnTo} />
          <Button type="submit" size="sm">
            Schedule
          </Button>
        </form>
      ) : null}
      {status === "scheduled" ? (
        <form action={advancePolicyInspection}>
          <input type="hidden" name="inspectionId" value={inspectionId} />
          <input type="hidden" name="action" value="complete" />
          <input type="hidden" name="returnTo" value={returnTo} />
          <Button type="submit" size="sm">
            Mark complete
          </Button>
        </form>
      ) : null}
      {status === "requested" || status === "scheduled" ? (
        <form action={advancePolicyInspection}>
          <input type="hidden" name="inspectionId" value={inspectionId} />
          <input type="hidden" name="action" value="waive" />
          <input type="hidden" name="returnTo" value={returnTo} />
          <Button type="submit" size="sm" variant="secondary">
            Waive
          </Button>
        </form>
      ) : null}
    </div>
  );
}
