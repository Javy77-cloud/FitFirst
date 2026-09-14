"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

/** Click name to open the lead detail layout (all fields). */
export function LeadListRailFocus({
  leadId,
  label,
  active,
}: {
  leadId: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={`/leads/${leadId}`}
      className={cn(
        "min-w-0 truncate text-left text-sm font-medium hover:underline",
        active ? "text-primary" : "text-navy",
      )}
      title="Open lead"
      data-ff-lead-rail-focus={leadId}
      data-active={active ? "true" : "false"}
    >
      {label}
    </Link>
  );
}
