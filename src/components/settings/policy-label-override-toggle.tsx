"use client";

import { useTransition } from "react";
import {
  clearPolicyLabelOverridesAction,
  setAllowPolicyLabelOverride,
} from "@/app/actions/policy-label-template";
import { Button } from "@/components/ui/button";
import { flashAction } from "@/lib/flash-client";

/**
 * Admin-only agency pref on /settings/policy-labels (not on the policy record).
 * Rename UI was removed from policy detail; this toggle locks the override API
 * and offers Clear all for existing manual names.
 */
export function PolicyLabelOverrideToggle({
  enabled,
  overrideCount,
}: {
  enabled: boolean;
  overrideCount: number;
}) {
  const [pending, startTransition] = useTransition();

  function clearAll() {
    startTransition(async () => {
      const result = await clearPolicyLabelOverridesAction();
      if (!result.ok) {
        flashAction(result.error ?? "Could not clear overrides", "error");
        return;
      }
      flashAction(
        result.cleared === 0
          ? "No manual overrides to clear"
          : `Cleared ${result.cleared} manual override${result.cleared === 1 ? "" : "s"}`,
      );
    });
  }

  return (
    <section className="ff-card space-y-3 p-4" data-ff-policy-label-override-toggle="">
      <h2 className="text-base font-semibold text-navy">Manual label overrides</h2>

      <form
        action={setAllowPolicyLabelOverride}
        className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2"
      >
        <div>
          <p className="text-sm font-semibold text-navy">Allow admins to override auto-labels</p>

        </div>
        <input type="hidden" name="allowPolicyLabelOverride" value={enabled ? "0" : "1"} />
        <Button type="submit" size="sm" variant={enabled ? "default" : "outline"} disabled={pending}>
          {enabled ? "On" : "Off"}
        </Button>
      </form>
      {overrideCount > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
          <p className="text-sm text-muted-foreground">
            {overrideCount} polic{overrideCount === 1 ? "y has" : "ies have"} a manual display name.
          </p>
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={clearAll}>
            Clear all overrides
          </Button>
        </div>
      ) : (
        <p className="text-helper text-muted-foreground">No manual overrides on file.</p>
      )}
    </section>
  );
}
