"use client";

import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fieldBuilderHref } from "@/lib/custom-fields/modules";

export function PolicyOverflowMenu({
  policyId,
  contactId,
  isAdmin,
}: {
  policyId: string;
  contactId?: string | null;
  isAdmin?: boolean;
}) {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        aria-label="More"
        data-ff-policy-overflow=""
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-sm hover:bg-muted"
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={() => router.push(`/policies/${policyId}/compare`)}>
          Compare renewal
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            router.push(
              `/claims/new?policy=${policyId}${contactId ? `&contact=${contactId}` : ""}`,
            )
          }
        >
          Log FNOL
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(`/certificates?policy=${policyId}`)}>
          Certificates
        </DropdownMenuItem>
        {isAdmin ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push(fieldBuilderHref("policies"))}>
              Edit layout
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
