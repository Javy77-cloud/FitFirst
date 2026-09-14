"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CreateTaskForm,
  type CreateTaskFormDefaults,
} from "@/components/tasks/create-task-form";
import type { CustomFieldDef, FieldLayout } from "@/lib/custom-fields/types";
import { cn } from "@/lib/utils";

export function CreateTaskDialog({
  defaults,
  users,
  layout,
  fields,
  currentUserId,
  trigger = "New Task",
  triggerClassName,
  open: openProp,
  onOpenChange,
  defaultOpen = false,
}: {
  defaults?: CreateTaskFormDefaults;
  users?: { id: string; name: string }[];
  layout?: FieldLayout;
  fields?: CustomFieldDef[];
  /** Signed-in agent — default assignee. */
  currentUserId?: string | null;
  trigger?: string;
  triggerClassName?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
}) {
  const router = useRouter();
  const controlled = openProp !== undefined;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = controlled ? openProp : internalOpen;

  useEffect(() => {
    if (defaultOpen && !controlled) setInternalOpen(true);
  }, [defaultOpen, controlled]);

  function setOpen(next: boolean) {
    if (!controlled) setInternalOpen(next);
    onOpenChange?.(next);
    if (!next && defaultOpen) {
      router.replace("/tasks");
    }
  }

  const formDefaults: CreateTaskFormDefaults = {
    ...defaults,
    returnTo: defaults?.returnTo ?? "/tasks",
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        className={cn(
          "hover:!bg-fit-red hover:!text-white hover:!border-fit-red",
          triggerClassName,
        )}
        data-ff-new-task=""
        onClick={() => setOpen(true)}
      >
        {trigger}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl" data-ff-create-task-dialog="">
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
            <DialogDescription>
              Link a record, pick a task type, then fill layout fields including due date and assignee.
            </DialogDescription>
          </DialogHeader>
          <CreateTaskForm
            compact
            defaults={{
              ...formDefaults,
              assigneeId: formDefaults.assigneeId ?? currentUserId ?? undefined,
            }}
            users={users}
            layout={layout}
            fields={fields}
            currentUserId={currentUserId}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
