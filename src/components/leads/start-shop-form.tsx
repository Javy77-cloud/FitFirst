"use client";

import { ProcessingLabel } from "@/components/desk/wait-hold";

import { useState, useTransition } from "react";
import { createDealFromLead } from "@/app/actions/crm";
import { Button } from "@/components/ui/button";
import {
  CONVERT_LEAD_CONFIRM_DESCRIPTION,
  CONVERT_LEAD_CONFIRM_LABEL,
  CONVERT_LEAD_CONFIRM_TITLE,
  LeadStatusConfirmDialog,
} from "@/components/leads/lead-queue-controls";

export function StartShopForm({
  leadId,
  label = "Convert",
  size = "xs",
  shopLines,
}: {
  leadId: string;
  label?: string;
  showLine?: boolean;
  size?: "xs" | "sm" | "default";
  shopLines?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function convert() {
    const form = new FormData();
    form.set("leadId", leadId);
    if (shopLines?.length) form.set("shopLines", shopLines.join(","));
    start(async () => {
      await createDealFromLead(form);
    });
  }

  return (
    <>
      <Button
        type="button"
        size={size === "default" ? "default" : size}
        data-ff-convert-deal=""
        disabled={pending}
        onClick={() => setOpen(true)}
      >
        {pending ? <ProcessingLabel>Converting…</ProcessingLabel> : label}
      </Button>
      <LeadStatusConfirmDialog
        open={open}
        title={CONVERT_LEAD_CONFIRM_TITLE}
        description={CONVERT_LEAD_CONFIRM_DESCRIPTION}
        confirmLabel={CONVERT_LEAD_CONFIRM_LABEL}
        pending={pending}
        onCancel={() => setOpen(false)}
        onConfirm={convert}
      />
    </>
  );
}
