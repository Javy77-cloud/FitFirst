"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setAgentPolicyAccessFlag } from "@/app/actions/agent-policy-access";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { flashAction } from "@/lib/flash-client";
import {
  AGENT_POLICY_ACCESS_AREAS,
  AGENT_POLICY_ACCESS_LABELS,
  type AgentPolicyAccess,
  type AgentPolicyAccessArea,
} from "@/lib/policy/agent-policy-access";
import { chipTabClass } from "@/lib/ui/chip-tabs";

type WriteStep = null | "warn1" | "warn2";

/** Admin Settings → Agent Policy Access. Read + Write per area; Write needs double confirm. */
export function AgentPolicyAccessPanel({ initial }: { initial: AgentPolicyAccess }) {
  const router = useRouter();
  const [access, setAccess] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [writeArea, setWriteArea] = useState<AgentPolicyAccessArea | null>(null);
  const [writeStep, setWriteStep] = useState<WriteStep>(null);

  function applyLocal(next: AgentPolicyAccess) {
    setAccess(next);
    router.refresh();
  }

  function toggleRead(area: AgentPolicyAccessArea) {
    const enabled = !access[area].read;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("area", area);
      fd.set("flag", "read");
      fd.set("enabled", enabled ? "1" : "0");
      const result = await setAgentPolicyAccessFlag(fd);
      if (!result.ok) {
        flashAction(result.error ?? "Could not save", "error");
        return;
      }
      applyLocal(result.access);
      flashAction(enabled ? "Read on for agents" : "Read off for agents");
    });
  }

  function requestWriteOn(area: AgentPolicyAccessArea) {
    setWriteArea(area);
    setWriteStep("warn1");
  }

  function toggleWriteOff(area: AgentPolicyAccessArea) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("area", area);
      fd.set("flag", "write");
      fd.set("enabled", "0");
      const result = await setAgentPolicyAccessFlag(fd);
      if (!result.ok) {
        flashAction(result.error ?? "Could not save", "error");
        return;
      }
      applyLocal(result.access);
      flashAction("Write off for agents");
    });
  }

  function confirmWriteStep() {
    if (!writeArea) return;
    if (writeStep === "warn1") {
      setWriteStep("warn2");
      return;
    }
    if (writeStep !== "warn2") return;
    const area = writeArea;
    setWriteStep(null);
    setWriteArea(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("area", area);
      fd.set("flag", "write");
      fd.set("enabled", "1");
      fd.set("writeConfirmed", "1");
      const result = await setAgentPolicyAccessFlag(fd);
      if (!result.ok) {
        flashAction(result.error ?? "Could not save", "error");
        return;
      }
      applyLocal(result.access);
      flashAction("Write on for agents");
    });
  }

  function cancelWrite() {
    setWriteStep(null);
    setWriteArea(null);
  }

  const areaLabel = writeArea ? AGENT_POLICY_ACCESS_LABELS[writeArea].title : "this area";

  return (
    <div className="space-y-4" data-ff-agent-policy-access="">
      <section className="ff-card space-y-2 p-4">
        <h2 className="text-base font-semibold text-navy">Always on for agents (read)</h2>
        <p className="text-sm text-muted-foreground">
          Servicing checklist, coverage schedule, documents, activity timeline, FNOL, inspections,
          certificates, and the renewals board stay visible. Agents cannot edit those surfaces —
          no extra toggles in this version.
        </p>
      </section>

      {AGENT_POLICY_ACCESS_AREAS.map((area) => {
        const flags = access[area];
        const copy = AGENT_POLICY_ACCESS_LABELS[area];
        return (
          <section
            key={area}
            className="ff-card space-y-3 p-4"
            data-ff-agent-policy-area={area}
          >
            <div>
              <h2 className="text-base font-semibold text-navy">{copy.title}</h2>
              <p className="text-sm text-muted-foreground">{copy.hint}</p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
              <div>
                <p className="text-sm font-semibold text-navy">Read</p>
                <p className="text-helper text-muted-foreground">
                  {flags.read ? "On — agents can see this block." : "Off — hidden for agents."}
                </p>
              </div>
              <button
                type="button"
                className={chipTabClass(flags.read)}
                aria-pressed={flags.read}
                disabled={pending}
                data-ff-agent-policy-read={area}
                onClick={() => toggleRead(area)}
              >
                {flags.read ? "On" : "Off"}
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-muted/30 px-3 py-2">
              <div>
                <p className="text-sm font-semibold text-navy">Write</p>
                <p className="text-helper text-muted-foreground">
                  Extra layer. Turning this on requires two confirms. Write also turns Read on.
                </p>
              </div>
              <button
                type="button"
                className={chipTabClass(flags.write)}
                aria-pressed={flags.write}
                disabled={pending}
                data-ff-agent-policy-write={area}
                onClick={() => (flags.write ? toggleWriteOff(area) : requestWriteOn(area))}
              >
                {flags.write ? "On" : "Off"}
              </button>
            </div>
          </section>
        );
      })}

      <Dialog
        open={writeStep != null}
        onOpenChange={(open) => {
          if (!open) cancelWrite();
        }}
      >
        <DialogContent className="sm:max-w-md" data-ff-agent-policy-write-confirm="">
          <DialogHeader>
            <DialogTitle>
              {writeStep === "warn1" ? "Writing permissions" : "Are you sure?"}
            </DialogTitle>
            <DialogDescription>
              {writeStep === "warn1"
                ? `You are giving writing permissions to your agent for ${areaLabel}.`
                : `Are you sure you want to give writing permissions to your agent for ${areaLabel}?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={cancelWrite} disabled={pending}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#002868] text-white hover:bg-[#BF0A30] hover:text-white"
              style={{ backgroundColor: "#002868", color: "#ffffff" }}
              onClick={confirmWriteStep}
              disabled={pending}
              data-ff-agent-policy-write-confirm-next=""
            >
              {writeStep === "warn1" ? "Continue" : "Yes, give write access"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
