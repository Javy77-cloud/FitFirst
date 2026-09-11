"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { logDeskActivity } from "@/app/actions/activities-desk";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { RecordTags } from "@/components/tags/record-tags";
import { fieldBuilderHref } from "@/lib/custom-fields/modules";
import { colorsFromModuleTags } from "@/lib/tags/tag-colors";
import { suggestedTagsFor } from "@/lib/tags/module-tags";

export function BusinessOverflowMenu({
  accountId,
  tags,
  tagExtra = [],
}: {
  accountId: string;
  tags?: string[] | null;
  tagExtra?: { name: string; color: string | null }[];
}) {
  const router = useRouter();
  const [tagsOpen, setTagsOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [reminderNote, setReminderNote] = useState("");

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          type="button"
          aria-label="More"
          data-ff-business-overflow=""
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-sm hover:bg-muted"
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[11rem]">
          <DropdownMenuItem onClick={() => setAssignOpen(true)}>Assign</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTagsOpen(true)}>Tag</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setArchiveOpen(true)}>Archive</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setReminderOpen(true)}>Set Reminder</DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              window.location.href = fieldBuilderHref("businesses");
            }}
          >
            Edit Layout
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setMergeOpen(true)}>Merge</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={tagsOpen} onOpenChange={setTagsOpen}>
        <DialogContent className="sm:max-w-md" data-ff-business-tags-dialog="">
          <DialogHeader>
            <DialogTitle>Tags</DialogTitle>
            <DialogDescription>Assign Tags For This Business.</DialogDescription>
          </DialogHeader>
          <RecordTags
            module="accounts"
            recordId={accountId}
            tags={tags}
            suggestions={suggestedTagsFor(
              "accounts",
              tagExtra.map((row) => row.name),
            )}
            colors={colorsFromModuleTags(tagExtra)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={reminderOpen} onOpenChange={setReminderOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Set Reminder</DialogTitle>
            <DialogDescription>Logs A Follow-Up Task On This Business.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            action={async () => {
              const form = new FormData();
              form.set("kind", "task");
              form.set("title", reminderNote.trim() || "Business Reminder");
              form.set("accountId", accountId);
              form.set("allowOrphan", "1");
              form.set("createReminder", "1");
              const due = new Date();
              due.setDate(due.getDate() + 1);
              form.set("dueAt", due.toISOString());
              await logDeskActivity(form);
              setReminderOpen(false);
              setReminderNote("");
              router.refresh();
            }}
          >
            <Input
              className="h-8"
              placeholder="Reminder Note…"
              value={reminderNote}
              onChange={(e) => setReminderNote(e.target.value)}
            />
            <Button type="submit" size="sm" className="hover:!bg-fit-red hover:!text-white">
              Save Reminder
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign</DialogTitle>
            <DialogDescription>
              {/* TODO(businesses): accounts table has no ownerId yet — wire assign when ownership lands. */}
              Assign Owner Is Not Wired For Businesses Yet (No Owner Column). Coming Next Wave.
            </DialogDescription>
          </DialogHeader>
          <Button type="button" size="sm" variant="outline" onClick={() => setAssignOpen(false)}>
            Close
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Archive</DialogTitle>
            <DialogDescription>
              {/* TODO(businesses): accounts have no archivedAt — stub until archive support. */}
              Archive Is Not Wired For Businesses Yet. Coming Next Wave.
            </DialogDescription>
          </DialogHeader>
          <Button type="button" size="sm" variant="outline" onClick={() => setArchiveOpen(false)}>
            Close
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
        <DialogContent className="sm:max-w-sm" data-ff-business-merge-stub="">
          <DialogHeader>
            <DialogTitle>Merge Businesses</DialogTitle>
            <DialogDescription>
              {/* TODO(businesses): full merge UI next wave — menu entry only this wave. */}
              Merge Businesses UI Is Coming Next Wave. Menu Entry Is Stubbed Only.
            </DialogDescription>
          </DialogHeader>
          <Button type="button" size="sm" variant="outline" onClick={() => setMergeOpen(false)}>
            Close
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
