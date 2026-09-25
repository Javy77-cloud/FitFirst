"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { correctPolicyTermDates } from "@/app/actions/policy-record";
import { ProcessingLabel } from "@/components/desk/wait-hold";
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
import { Textarea } from "@/components/ui/textarea";
import { flashAction } from "@/lib/flash-client";

function toDateInputValue(value: string | Date | null | undefined): string {
  if (!value) return "";
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  }
  if (Number.isNaN(value.getTime())) return "";
  return value.toISOString().slice(0, 10);
}

/** Agency-only override when book term dates disagree with carrier/API truth. */
export function CorrectTermDatesDialog({
  policyId,
  effectiveDate,
  expirationDate,
  renewalDate,
}: {
  policyId: string;
  effectiveDate: Date | string;
  expirationDate: Date | string;
  renewalDate?: Date | string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [effective, setEffective] = useState(toDateInputValue(effectiveDate));
  const [expiration, setExpiration] = useState(toDateInputValue(expirationDate));
  const [renewal, setRenewal] = useState(toDateInputValue(renewalDate));
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) return;
    setEffective(toDateInputValue(effectiveDate));
    setExpiration(toDateInputValue(expirationDate));
    setRenewal(toDateInputValue(renewalDate));
    setReason("");
  }, [open, effectiveDate, expirationDate, renewalDate]);

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        data-ff-correct-term-dates=""
        onClick={() => setOpen(true)}
      >
        Correct term dates
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="sm:max-w-md"
          showCloseButton={false}
          data-ff-correct-term-dates-dialog=""
        >
          <DialogHeader>
            <DialogTitle>Correct term dates</DialogTitle>

          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              start(async () => {
                const result = await correctPolicyTermDates({
                  policyId,
                  effectiveDate: effective,
                  expirationDate: expiration,
                  renewalDate: renewal,
                  reason,
                });
                if (!result.ok) {
                  flashAction(result.error ?? "Could not correct term dates", "error");
                  return;
                }
                flashAction("Term dates corrected");
                setOpen(false);
                router.refresh();
              });
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="ff-term-effective" className="text-xs">
                  Effective date
                </Label>
                <Input
                  id="ff-term-effective"
                  type="date"
                  required
                  className="mt-1"
                  value={effective}
                  disabled={pending}
                  onChange={(e) => setEffective(e.target.value)}
                  data-ff-term-override="effectiveDate"
                />
              </div>
              <div>
                <Label htmlFor="ff-term-expiration" className="text-xs">
                  Expiration date
                </Label>
                <Input
                  id="ff-term-expiration"
                  type="date"
                  required
                  className="mt-1"
                  value={expiration}
                  disabled={pending}
                  onChange={(e) => setExpiration(e.target.value)}
                  data-ff-term-override="expirationDate"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="ff-term-renewal" className="text-xs">
                Renewal date
              </Label>
              <Input
                id="ff-term-renewal"
                type="date"
                className="mt-1"
                value={renewal}
                disabled={pending}
                onChange={(e) => setRenewal(e.target.value)}
                data-ff-term-override="renewalDate"
              />

            </div>
            <div>
              <Label htmlFor="ff-term-reason" className="text-xs">
                Reason <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="ff-term-reason"
                required
                rows={3}
                maxLength={500}
                className="mt-1"
                placeholder="e.g. Book import used wrong Medicare effective/expiration vs carrier."
                value={reason}
                disabled={pending}
                onChange={(e) => setReason(e.target.value)}
                data-ff-term-override="reason"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending || !reason.trim()}>
                {pending ? <ProcessingLabel>Saving…</ProcessingLabel> : "Save correction"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
