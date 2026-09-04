"use client";

import { useState } from "react";
import { createDealFromLead } from "@/app/actions/crm";
import { LinePicker } from "@/components/deal/line-picker";
import { Button } from "@/components/ui/button";

export function StartShopForm({
  leadId,
  label = "Start shop",
  showLine = false,
  size = "xs",
}: {
  leadId: string;
  label?: string;
  showLine?: boolean;
  size?: "xs" | "sm";
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className={showLine ? "space-y-3" : undefined}
      action={async (formData) => {
        setPending(true);
        setError(null);
        await createDealFromLead(formData);
        setPending(false);
      }}
    >
      <input type="hidden" name="leadId" value={leadId} />
      {showLine ? <LinePicker defaultCode="HO" /> : <input type="hidden" name="line" value="HO" />}
      <Button type="submit" size={size} disabled={pending}>
        {pending ? "Starting…" : label}
      </Button>
      {error ? <p className="mt-1 text-xs text-fit-red">{error}</p> : null}
    </form>
  );
}
