"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SNOOZE_DELAY_UNITS, SNOOZE_PRESETS, type SnoozeDelayUnit } from "@/lib/leads/follow-up-templates";

export function FollowUpSnoozePresets({
  pending,
  onSnooze,
  testId = "follow-up-snooze",
}: {
  pending?: boolean;
  onSnooze: (amount: number, unit: SnoozeDelayUnit) => void | Promise<void>;
  testId?: string;
}) {
  const [customOpen, setCustomOpen] = useState(false);
  const [amount, setAmount] = useState("15");
  const [unit, setUnit] = useState<SnoozeDelayUnit>("minutes");

  function applyCustom() {
    const next = Number(amount);
    if (!Number.isFinite(next) || next < 1) return;
    void onSnooze(next, unit);
  }

  return (
    <div className="space-y-2" data-testid={testId}>
      <div className="flex flex-wrap gap-2">
        {SNOOZE_PRESETS.map((preset) => (
          <Button
            key={preset.label}
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            data-snooze-preset={preset.label}
            onClick={() => void onSnooze(preset.amount, preset.unit)}
          >
            {preset.label}
          </Button>
        ))}
        {!customOpen ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            data-testid={`${testId}-custom-open`}
            onClick={() => setCustomOpen(true)}
          >
            Custom snooze
          </Button>
        ) : null}
      </div>
      {customOpen ? (
        <div
          className="flex flex-wrap items-end gap-2 rounded-md border border-border bg-secondary/40 px-3 py-2"
          data-testid={`${testId}-custom-form`}
        >
          <label className="grid gap-1 text-xs font-medium text-navy">
            Number
            <Input
              type="number"
              min={1}
              max={unit === "days" ? 30 : unit === "hours" ? 24 * 30 : 24 * 60 * 30}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="h-8 w-20"
              aria-label="Custom snooze amount"
            />
          </label>
          <label className="grid gap-1 text-xs font-medium text-navy">
            Unit
            <select
              value={unit}
              onChange={(event) => setUnit(event.target.value as SnoozeDelayUnit)}
              className="h-8 rounded-md border border-border bg-card px-2 text-sm text-navy"
              aria-label="Custom snooze unit"
            >
              {SNOOZE_DELAY_UNITS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            size="sm"
            disabled={pending || !Number.isFinite(Number(amount)) || Number(amount) < 1}
            data-testid={`${testId}-custom`}
            onClick={applyCustom}
          >
            Apply
          </Button>
        </div>
      ) : null}
    </div>
  );
}
