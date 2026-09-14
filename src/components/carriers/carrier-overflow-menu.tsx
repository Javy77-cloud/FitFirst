"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { logDeskActivity } from "@/app/actions/activities-desk";
import {
  archiveCarrier,
  mergeCarrierIntoSurvivor,
  searchCarriersForMerge,
} from "@/app/actions/carriers-ops";
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
import { flashAction } from "@/lib/flash-client";
import { RecordTags } from "@/components/tags/record-tags";
import { colorsFromModuleTags } from "@/lib/tags/tag-colors";
import { suggestedTagsFor } from "@/lib/tags/module-tags";

export function CarrierOverflowMenu({
  carrierId,
  carrierName,
  admin,
  tags,
  tagExtra = [],
}: {
  carrierId: string;
  carrierName: string;
  admin: boolean;
  tags?: string[] | null;
  tagExtra?: { name: string; color: string | null }[];
}) {
  const router = useRouter();
  const [reminderOpen, setReminderOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [reminderNote, setReminderNote] = useState("");
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<{ id: string; name: string; agencyCode: string | null }[]>([]);
  const [pickedId, setPickedId] = useState<string | null>(null);

  useEffect(() => {
    if (!mergeOpen || q.trim().length < 2) {
      setHits([]);
      return;
    }
    let cancelled = false;
    void searchCarriersForMerge(q).then((rows) => {
      if (!cancelled) setHits(rows.filter((r) => r.id !== carrierId));
    });
    return () => {
      cancelled = true;
    };
  }, [mergeOpen, q, carrierId]);

  async function saveReminder() {
    const fd = new FormData();
    fd.set("kind", "task");
    fd.set("title", `Carrier reminder: ${carrierName}`);
    fd.set("notes", reminderNote);
    fd.set("allowOrphan", "1");
    await logDeskActivity(fd);
    flashAction("Reminder set");
    setReminderOpen(false);
    setReminderNote("");
  }

  async function doArchive() {
    const result = await archiveCarrier(carrierId);
    if (!result.ok) {
      flashAction(result.error, "error");
      return;
    }
    flashAction("Carrier archived (inactive)");
    setArchiveOpen(false);
    router.refresh();
  }

  async function doMerge() {
    if (!pickedId) return;
    const result = await mergeCarrierIntoSurvivor({ keepId: carrierId, dropId: pickedId });
    if (!result.ok) {
      flashAction(result.error, "error");
      return;
    }
    flashAction("Merge stub applied (duplicate inactivated)");
    setMergeOpen(false);
    router.refresh();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          type="button"
          aria-label="More"
          data-ff-carrier-overflow=""
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-sm hover:bg-muted"
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={() => {
              document.getElementById("identity")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTagsOpen(true)}>Tags</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setAssignOpen(true)}>Assign</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setReminderOpen(true)}>Set reminder</DropdownMenuItem>
          {admin ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setMergeOpen(true)}>Merge…</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setArchiveOpen(true)}>Archive</DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={reminderOpen} onOpenChange={setReminderOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set reminder</DialogTitle>
            <DialogDescription>Creates a desk task tied to this carrier name.</DialogDescription>
          </DialogHeader>
          <Input
            className="h-8"
            placeholder="Note"
            value={reminderNote}
            onChange={(e) => setReminderNote(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setReminderOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={() => void saveReminder()}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Archive carrier?</DialogTitle>
            <DialogDescription>
              Sets status to Inactive. Policies stay linked — this does not delete the record.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setArchiveOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={() => void doArchive()}>
              Archive
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Merge carrier</DialogTitle>
            <DialogDescription>
              Merges the selected carrier into this one — policies, quotes, and portal login move over. The duplicate is retired.
            </DialogDescription>
          </DialogHeader>
          <Input
            className="h-8"
            placeholder="Search carrier to merge away…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
            {hits.map((hit) => (
              <li key={hit.id}>
                <button
                  type="button"
                  className={
                    pickedId === hit.id
                      ? "w-full rounded bg-[#002868] px-2 py-1 text-left text-white"
                      : "w-full rounded px-2 py-1 text-left hover:bg-secondary"
                  }
                  onClick={() => setPickedId(hit.id)}
                >
                  {hit.name}
                  {hit.agencyCode ? ` · ${hit.agencyCode}` : ""}
                </button>
              </li>
            ))}
          </ul>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setMergeOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" disabled={!pickedId} onClick={() => void doMerge()}>
              Merge into this
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={tagsOpen} onOpenChange={setTagsOpen}>
        <DialogContent className="sm:max-w-md" data-ff-carrier-tags-dialog="">
          <DialogHeader>
            <DialogTitle>Tags</DialogTitle>
            <DialogDescription>Assign tags for this carrier.</DialogDescription>
          </DialogHeader>
          <RecordTags
            module="carriers"
            recordId={carrierId}
            tags={tags}
            suggestions={suggestedTagsFor(
              "carriers",
              tagExtra.map((row) => row.name),
            )}
            colors={colorsFromModuleTags(tagExtra)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-sm" data-ff-carrier-assign-dialog="">
          <DialogHeader>
            <DialogTitle>Assign</DialogTitle>
            <DialogDescription>
              Carriers stay on the shared appetite book — no owner to assign.
            </DialogDescription>
          </DialogHeader>
          <Button type="button" size="sm" variant="outline" onClick={() => setAssignOpen(false)}>
            Close
          </Button>
        </DialogContent>
      </Dialog>

    </>
  );
}
