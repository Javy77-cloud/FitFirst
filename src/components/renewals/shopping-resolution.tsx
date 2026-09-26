"use client";

import { useState } from "react";
import { resolveRenewalShopping } from "@/app/actions/renewal-shopping";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Resolution = "accept" | "replace" | "drop";

export function ShoppingResolution({
  policyId,
  health,
}: {
  policyId: string;
  health: boolean;
}) {
  const [open, setOpen] = useState<Resolution | null>(null);

  return (
    <section className="ff-card space-y-3 p-4" data-ff-shopping-resolution="">
      <div>
        <h2 className="text-sm font-semibold text-navy">Resolve shopping</h2>
        <p className="text-xs text-muted-foreground">
          {health
            ? "The chosen external policy is written as its own record. Other products stay on their renewal."
            : "Accept or replace the incumbent. Drop puts this renewal back on its track."}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" data-ff-shop-accept="" onClick={() => setOpen("accept")}>
          Accept
        </Button>
        <Button type="button" size="sm" variant="outline" data-ff-shop-replace="" onClick={() => setOpen("replace")}>
          Replace
        </Button>
        <Button type="button" size="sm" variant="outline" data-ff-shop-drop="" onClick={() => setOpen("drop")}>
          Drop
        </Button>
      </div>
      <Dialog open={open != null} onOpenChange={(next) => !next && setOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {open === "accept" ? "Accept the quoted policy" : open === "replace" ? "Replace and flag cancellation" : "Drop shopping"}
            </DialogTitle>
            <DialogDescription>
              {open === "drop"
                ? "No policy change. The shopping deal is archived and renewal beats resume."
                : open === "replace"
                  ? "Same as accept. The incumbent is flagged cancellation required, effective the new policy start."
                  : "The new policy becomes the bound renewal. The incumbent is marked non-renewing. Remaining beats for this product stop."}
            </DialogDescription>
          </DialogHeader>
          {open ? (
            <form action={resolveRenewalShopping} className="space-y-2">
              <input type="hidden" name="policyId" value={policyId} />
              <input type="hidden" name="resolution" value={open} />
              {open !== "drop" ? (
                <>
                  <label className="block text-xs font-medium text-navy">
                    Policy number
                    <input
                      name="policyNumber"
                      required
                      className="mt-1 h-8 w-full rounded-md border px-2 text-sm"
                      data-ff-shop-policy-number=""
                    />
                  </label>
                  <label className="block text-xs font-medium text-navy">
                    Carrier
                    <input name="carrierName" className="mt-1 h-8 w-full rounded-md border px-2 text-sm" />
                  </label>
                  <label className="block text-xs font-medium text-navy">
                    Plan type
                    <input name="planType" className="mt-1 h-8 w-full rounded-md border px-2 text-sm" />
                  </label>
                  <label className="block text-xs font-medium text-navy">
                    Premium
                    <input name="premium" className="mt-1 h-8 w-full rounded-md border px-2 text-sm" />
                  </label>
                  <label className="block text-xs font-medium text-navy">
                    {open === "replace" ? "New policy start (cancel effective)" : "Effective date"}
                    <input
                      name="effectiveDate"
                      type="date"
                      required={open === "replace"}
                      className="mt-1 h-8 w-full rounded-md border px-2 text-sm"
                      data-ff-shop-effective=""
                    />
                  </label>
                </>
              ) : null}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(null)}>
                  Back
                </Button>
                <Button
                  type="submit"
                  data-ff-shop-accept-confirm={open === "accept" ? "" : undefined}
                  data-ff-shop-replace-confirm={open === "replace" ? "" : undefined}
                  data-ff-shop-drop-confirm={open === "drop" ? "" : undefined}
                >
                  Confirm {open}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
