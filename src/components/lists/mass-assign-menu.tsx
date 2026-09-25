"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { assignSelectedOwner } from "@/app/actions/list-bulk";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  canMassAssignOwner,
  massAssignBlockedReason,
} from "@/lib/lists/list-bulk";
import type { CrmListModule } from "@/lib/lists/selection-actions";
import type { MassUpdateOwner } from "@/components/lists/mass-update";

export function MassAssignMenu({
  module,
  selected,
  owners,
  busy,
  onBusy,
  onMessage,
  onClear,
}: {
  module: CrmListModule;
  selected: string[];
  owners: MassUpdateOwner[];
  busy: boolean;
  onBusy: (busy: boolean) => void;
  onMessage: (message: string | null) => void;
  onClear: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [ownerId, setOwnerId] = useState("");
  const blocked = massAssignBlockedReason(module);
  const canAssign = canMassAssignOwner(module);

  if (selected.length === 0) return null;

  async function apply() {
    if (!canAssign) return;
    onBusy(true);
    const form = new FormData();
    form.set("module", module);
    form.set("ownerId", ownerId);
    for (const id of selected) form.append("recordId", id);
    const result = await assignSelectedOwner(form);
    onMessage(result.message);
    onBusy(false);
    if (result.ok) {
      setOpen(false);
      setOwnerId("");
      onClear();
      router.refresh();
    }
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={busy}
        data-testid="mass-assign-trigger"
        data-ff-mass-assign=""
        onClick={() => setOpen(true)}
      >
        Assign
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm" showCloseButton data-ff-mass-assign-dialog="">
          <DialogHeader>
            <DialogTitle>Assign · {selected.length} selected</DialogTitle>

          </DialogHeader>
          {canAssign ? (
            <div>
              <Label className="text-xs">Owner</Label>
              <select
                className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                data-testid="mass-assign-owner"
              >
                <option value="">Pick an owner…</option>
                {owners.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              {canAssign ? "Cancel" : "Close"}
            </Button>
            {canAssign ? (
              <Button
                type="button"
                size="sm"
                disabled={busy || !ownerId}
                onClick={() => void apply()}
                data-testid="mass-assign-apply"
              >
                Assign {selected.length}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
