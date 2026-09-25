"use client";

import { useState } from "react";
import { createPolicyInstallment } from "@/app/actions/ams";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { chipTabClass } from "@/lib/ui/chip-tabs";

type StatusChoice = "paid" | "overdue";

/** Add installment on policy Billing → Payment schedule. */
export function AddInstallmentDialog({ policyId }: { policyId: string }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<StatusChoice>("overdue");

  return (
    <>
      <Button
        type="button"
        size="sm"
        className="ff-policy-primary-btn shrink-0"
        data-ff-add-installment=""
        style={{ backgroundColor: "#002868", color: "#ffffff", borderColor: "#002868" }}
        onClick={() => setOpen(true)}
      >
        Add installment
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setStatus("overdue");
        }}
      >
        <DialogContent className="sm:max-w-md" data-ff-add-installment-dialog="">
          <DialogHeader>
            <DialogTitle>Add installment</DialogTitle>

          </DialogHeader>
          <form action={createPolicyInstallment} className="space-y-3">
            <input type="hidden" name="policyId" value={policyId} />
            <input type="hidden" name="returnTo" value={`/policies/${policyId}?tab=billing`} />
            <input type="hidden" name="billType" value="agency_bill" />
            <input type="hidden" name="status" value={status} />

            <div>
              <Label htmlFor="ff-installment-due" className="text-xs">
                Due date
              </Label>
              <Input id="ff-installment-due" name="dueOn" type="date" className="mt-1" required />
            </div>

            <div>
              <Label htmlFor="ff-installment-amount" className="text-xs">
                Amount
              </Label>
              <Input
                id="ff-installment-amount"
                name="amount"
                inputMode="decimal"
                placeholder="284.00"
                className="mt-1"
                required
              />
            </div>

            <div>
              <p className="text-xs font-medium text-navy">Status</p>
              <div
                className="mt-1.5 flex flex-wrap gap-1.5"
                role="group"
                aria-label="Installment status"
              >
                <button
                  type="button"
                  className={chipTabClass(status === "paid")}
                  aria-pressed={status === "paid"}
                  onClick={() => setStatus("paid")}
                >
                  Paid
                </button>
                <button
                  type="button"
                  className={chipTabClass(status === "overdue")}
                  aria-pressed={status === "overdue"}
                  onClick={() => setStatus("overdue")}
                >
                  Overdue
                </button>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#002868] text-white hover:bg-[#BF0A30] hover:text-white"
              >
                Save installment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
