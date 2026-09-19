"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { AddLocationForm } from "@/components/account-360/add-location-form";
import { RecordLink } from "@/components/record-links";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Loc = {
  id: string;
  label?: string | null;
  address1?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
};

type CoveringPolicy = {
  locationId: string | null;
  policyId: string;
  policyNumber: string;
};

export function BusinessLocationsSection({
  accountId,
  locations,
  coveringPolicies,
}: {
  accountId: string;
  locations: Loc[];
  coveringPolicies: CoveringPolicy[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div data-ff-business-locations="">
      <div className="mb-2 flex justify-end">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 gap-1"
          onClick={() => setOpen(true)}
        >
          <Plus className="size-3.5" />
          Add Location
        </Button>
      </div>
      {locations.length === 0 ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>No Premises Yet — Add A Street Address.</span>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {locations.map((loc) => {
            const line = [loc.address1 || loc.street, loc.city, loc.state, loc.zip]
              .filter(Boolean)
              .join(", ");
            const covering = coveringPolicies.filter((p) => p.locationId === loc.id);
            return (
              <li key={loc.id} className="py-2 text-sm" data-ff-business-location={loc.id}>
                <div className="font-medium text-[#002868]">
                  {loc.label || line || "Location"}
                </div>
                {loc.label && line ? (
                  <div className="text-xs text-muted-foreground">{line}</div>
                ) : null}
                {covering.length === 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">No Covering Policy Linked.</p>
                ) : (
                  <div className="mt-1 flex flex-wrap gap-2 text-xs">
                    {covering.map((p) => (
                      <RecordLink key={p.policyId} href={`/policies/${p.policyId}`}>
                        Policy {p.policyNumber}
                      </RecordLink>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg" data-ff-add-location-dialog="">
          <DialogHeader>
            <DialogTitle>Add Location</DialogTitle>
            <DialogDescription>Premises For Commercial Coverage On This Account.</DialogDescription>
          </DialogHeader>
          <AddLocationForm businessId={accountId} defaultOccupancy="commercial" />
        </DialogContent>
      </Dialog>
    </div>
  );
}
