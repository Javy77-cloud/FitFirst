"use client";

import { useMemo, useState } from "react";
import { createPacketTask, createServicingTask } from "@/app/actions/ams";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { chipTabClass } from "@/lib/ui/chip-tabs";
import { snoozeDueAt } from "@/lib/leads/follow-up-templates";

type Mode = "servicing" | "packet";

type Preset = {
  id: string;
  label: string;
  minutes: number;
};

const NOTIFY_PRESETS: Preset[] = [
  { id: "15m", label: "In 15 min", minutes: 15 },
  { id: "1h", label: "In 1 hour", minutes: 60 },
  { id: "1d", label: "In 1 day", minutes: 24 * 60 },
  { id: "1w", label: "In 1 week", minutes: 7 * 24 * 60 },
];

function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Create task / Collect packet with notify-when presets (in-app reminder). */
export function CreateServicingTaskDialog({
  policyId,
  itemKey,
  mode,
  label,
  triggerVariant = "secondary",
  triggerClassName,
}: {
  policyId: string;
  itemKey: string;
  mode: Mode;
  label: string;
  triggerVariant?: "default" | "secondary" | "outline" | "ghost" | "destructive" | "link";
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [presetId, setPresetId] = useState<string>("1d");
  const defaultCustom = useMemo(() => {
    const d = snoozeDueAt(new Date(), 1, "days");
    return toDatetimeLocalValue(d);
  }, [open]);
  const [customAt, setCustomAt] = useState(defaultCustom);

  const action = mode === "packet" ? createPacketTask : createServicingTask;
  const keyName = mode === "packet" ? "docKey" : "itemKey";

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant={triggerVariant}
        className={triggerClassName}
        data-ff-create-servicing-task=""
        data-ff-task-mode={mode}
        onClick={() => {
          setPresetId("1d");
          setCustomAt(toDatetimeLocalValue(snoozeDueAt(new Date(), 1, "days")));
          setOpen(true);
        }}
      >
        {label}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setPresetId("1d");
        }}
      >
        <DialogContent className="sm:max-w-md" data-ff-create-servicing-task-dialog="">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
            <DialogDescription>
              Pick when you want the in-app notification. Task due matches that time — nothing emailed.
            </DialogDescription>
          </DialogHeader>
          <form action={action} className="space-y-3">
            <input type="hidden" name="policyId" value={policyId} />
            <input type="hidden" name={keyName} value={itemKey} />
            {presetId === "custom" ? (
              <input type="hidden" name="notifyAt" value={customAt} />
            ) : (
              <input
                type="hidden"
                name="notifyInMinutes"
                value={String(NOTIFY_PRESETS.find((p) => p.id === presetId)?.minutes ?? 1440)}
              />
            )}

            <div>
              <p className="text-xs font-medium text-navy">Notify me</p>
              <div
                className="mt-1.5 flex flex-wrap gap-1.5"
                role="group"
                aria-label="Notify when"
              >
                {NOTIFY_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={chipTabClass(presetId === preset.id)}
                    aria-pressed={presetId === preset.id}
                    onClick={() => setPresetId(preset.id)}
                  >
                    {preset.label}
                  </button>
                ))}
                <button
                  type="button"
                  className={chipTabClass(presetId === "custom")}
                  aria-pressed={presetId === "custom"}
                  onClick={() => setPresetId("custom")}
                >
                  Custom
                </button>
              </div>
            </div>

            {presetId === "custom" ? (
              <div>
                <Label htmlFor={`ff-servicing-notify-${itemKey}`} className="text-xs">
                  Date & time
                </Label>
                <Input
                  id={`ff-servicing-notify-${itemKey}`}
                  type="datetime-local"
                  className="mt-1"
                  value={customAt}
                  onChange={(e) => setCustomAt(e.target.value)}
                  required
                />
              </div>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="ff-policy-primary-btn bg-[#002868] text-white hover:bg-[#BF0A30] hover:text-white"
                style={{ backgroundColor: "#002868", color: "#ffffff", borderColor: "#002868" }}
                data-ff-create-servicing-task-submit=""
              >
                Create task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
