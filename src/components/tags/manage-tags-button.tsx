"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ManageTagsDialog } from "@/components/tags/manage-tags-dialog";
import type { TagModule } from "@/lib/tags/module-tags";

/** List toolbar trigger — agents can manage the module catalog (not admin-only). */
export function ManageTagsButton({ module }: { module: TagModule }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        data-ff-manage-tags=""
        data-ff-manage-tags-trigger={module}
        onClick={() => setOpen(true)}
      >
        Manage Tags
      </Button>
      <ManageTagsDialog module={module} open={open} onOpenChange={setOpen} />
    </>
  );
}
