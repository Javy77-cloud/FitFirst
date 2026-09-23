"use client";

import { useMemo, useState } from "react";
import { assignInboxThread } from "@/app/actions/inbox";
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
import {
  inboxAssignConfirmCopy,
  type InboxAssignAgent,
} from "@/lib/desk/inbox-assign";

const triggerClass = "ff-panel-ghost";

export function InboxAssignDialog({
  threadId,
  subject,
  from,
  contactId,
  dealId,
  policyId,
  suggestedAgentId,
  agents,
}: {
  threadId: string;
  subject: string;
  from: string;
  contactId?: string | null;
  dealId?: string | null;
  policyId?: string | null;
  suggestedAgentId?: string | null;
  agents: InboxAssignAgent[];
}) {
  const mounted = useClientMounted();
  const defaultId =
    suggestedAgentId && agents.some((a) => a.id === suggestedAgentId)
      ? suggestedAgentId
      : agents[0]?.id ?? "";
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState(defaultId);
  const target = useMemo(
    () => agents.find((user) => user.id === picked) ?? null,
    [picked, agents],
  );

  if (agents.length === 0) return null;

  if (!mounted) {
    return (
      <button type="button" className={triggerClass}>
        Assign to agent
      </button>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setPicked(defaultId);
      }}
    >
      <DialogTrigger
        render={
          <button type="button" className={triggerClass} data-ff-inbox-assign="" />
        }
      >
        Assign to agent
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign to agent</DialogTitle>
          <DialogDescription>
            {target
              ? inboxAssignConfirmCopy(target.name)
              : "Pick who should work this agency thread. They get an Inbox notification with a deep link."}
          </DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            await assignInboxThread(formData);
            setOpen(false);
          }}
          className="space-y-3"
        >
          <input type="hidden" name="threadId" value={threadId} />
          <input type="hidden" name="subject" value={subject} />
          <input type="hidden" name="from" value={from} />
          {contactId ? <input type="hidden" name="contactId" value={contactId} /> : null}
          {dealId ? <input type="hidden" name="dealId" value={dealId} /> : null}
          {policyId ? <input type="hidden" name="policyId" value={policyId} /> : null}
          <label className="block text-xs font-semibold text-navy">
            Agent
            <select
              name="agentId"
              required
              value={picked}
              onChange={(event) => setPicked(event.target.value)}
              className="mt-1 block h-8 w-full rounded-md border border-input bg-card px-2 text-sm text-navy"
              data-ff-inbox-assign-select=""
            >
              <option value="" disabled>
                Select agent
              </option>
              {agents.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                  {suggestedAgentId === user.id ? " · matched owner" : ""}
                </option>
              ))}
            </select>
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!target}>
              Assign
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
