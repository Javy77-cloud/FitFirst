"use client";

import { useMemo, useState } from "react";
import { transferDealOwner } from "@/app/actions/owners";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useClientMounted } from "@/hooks/use-client-mounted";
import { dealTransferConfirmCopy, type DeskUserOption } from "@/lib/deals/transfer";

const changeOwnerTriggerClass =
  "rounded border border-border px-1.5 py-0.5 text-[11px] text-primary hover:bg-secondary";

export function ChangeOwnerDialog({
  dealId,
  ownerId,
  users,
}: {
  dealId: string;
  ownerId?: string | null;
  users: DeskUserOption[];
}) {
  const mounted = useClientMounted();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState(ownerId ?? "");
  const target = useMemo(
    () => users.find((user) => user.id === picked) ?? null,
    [picked, users],
  );

  if (users.length === 0) return null;

  if (!mounted) {
    return (
      <button type="button" className={changeOwnerTriggerClass}>
        Change owner
      </button>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setPicked(ownerId ?? "");
      }}
    >
      <DialogTrigger
        render={
          <button
            type="button"
            className={changeOwnerTriggerClass}
          />
        }
      >
        Change owner
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change owner</DialogTitle>
          <DialogDescription>
            {target
              ? dealTransferConfirmCopy(target.name)
              : "Pick the agent who should own this deal and its follow-ups."}
          </DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            await transferDealOwner(formData);
            setOpen(false);
          }}
          className="space-y-3"
        >
          <input type="hidden" name="dealId" value={dealId} />
          <label className="block text-xs text-muted-foreground">
            Agent
            <select
              name="ownerId"
              required
              value={picked}
              onChange={(event) => setPicked(event.target.value)}
              className="mt-1 block h-8 w-full rounded-md border border-input bg-card px-2 text-sm text-navy"
            >
              <option value="" disabled>
                Select agent
              </option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!target || target.id === ownerId}>
              Transfer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
