"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { logDeskActivity } from "@/app/actions/activities-desk";
import {
  loadBusinessMergePreview,
  mergeBusinessIntoSurvivor,
  searchBusinessesForMerge,
} from "@/app/actions/businesses-ops";
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
import { BusinessLayoutTemplatePicker } from "@/components/businesses/business-layout-template-picker";

const LABEL_TO_KEY: Record<string, string> = {
  Name: "name",
  "Legal Name": "legalName",
  DBA: "dba",
  Email: "email",
  Phone: "phone",
  "Mailing Address": "mailingAddress",
  City: "city",
  State: "state",
  ZIP: "zip",
  Website: "website",
  "Entity Type": "entityType",
  Industry: "industry",
  NAICS: "naics",
  "Employee Count": "employeeCount",
  "Annual Sales": "annualSales",
  Payroll: "payrollW2",
  "Years In Business": "yearsInBusiness",
  Source: "source",
  Referral: "referral",
  Notes: "notes",
  "Life Notes": "lifeNotes",
  "Health Notes": "healthNotes",
  "P&C Notes": "pcNotes",
};

type PreviewRow = {
  field: string;
  keeper: string;
  duplicate: string;
  action: "keep" | "copy" | "append";
};

type Hit = {
  id: string;
  name: string;
  dba: string | null;
  email: string | null;
  phone: string | null;
};

export function BusinessOverflowMenu({
  accountId,
  accountName,
  tags,
  tagExtra = [],
}: {
  accountId: string;
  accountName?: string;
  tags?: string[] | null;
  tagExtra?: { name: string; color: string | null }[];
}) {
  const router = useRouter();
  const [tagsOpen, setTagsOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [reminderNote, setReminderNote] = useState("");

  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [pickedLabel, setPickedLabel] = useState("");
  const [survivorId, setSurvivorId] = useState<"this" | "other">("this");
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [picks, setPicks] = useState<Record<string, "keeper" | "duplicate">>({});
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    if (!mergeOpen) return;
    let cancelled = false;
    void searchBusinessesForMerge(q, accountId).then((rows) => {
      if (!cancelled) setHits(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [mergeOpen, q, accountId]);

  function resetMerge() {
    setQ("");
    setHits([]);
    setError(null);
    setPickedId(null);
    setPickedLabel("");
    setSurvivorId("this");
    setPreviewRows([]);
    setPicks({});
  }

  async function loadPreviewForSurvivor(otherId: string, keepOther: boolean) {
    const keeperId = keepOther ? otherId : accountId;
    const duplicateId = keepOther ? accountId : otherId;
    const preview = await loadBusinessMergePreview(keeperId, duplicateId);
    if (!preview.ok) {
      setError(preview.error ?? "Preview Failed.");
      return false;
    }
    setPreviewRows(preview.rows);
    const initial: Record<string, "keeper" | "duplicate"> = {};
    for (const r of preview.rows) {
      const key = LABEL_TO_KEY[r.field];
      if (!key) continue;
      initial[key] = r.action === "copy" || r.action === "append" ? "duplicate" : "keeper";
    }
    setPicks(initial);
    return true;
  }

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
          <DropdownMenuItem onClick={() => setTagsOpen(true)}>Tags</DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              window.location.href = fieldBuilderHref("businesses");
            }}
          >
            Edit Layout
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setLayoutOpen(true)}>Layout Templates</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setAssignOpen(true)}>Assign</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setReminderOpen(true)}>Set Reminder</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setArchiveOpen(true)}>Archive</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setMergeOpen(true)}>Merge Accounts</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={tagsOpen} onOpenChange={setTagsOpen}>
        <DialogContent className="sm:max-w-md" data-ff-business-tags-dialog="">
          <DialogHeader>
            <DialogTitle>Tags</DialogTitle>

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

      <Dialog open={layoutOpen} onOpenChange={setLayoutOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Layout Templates</DialogTitle>

          </DialogHeader>
          {layoutOpen ? (
            <BusinessLayoutTemplatePicker
              key="business-layout-templates"
              accountId={accountId}
              onApplied={() => setLayoutOpen(false)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={reminderOpen} onOpenChange={setReminderOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Set Reminder</DialogTitle>

          </DialogHeader>
          <form
            className="space-y-3"
            action={async () => {
              const form = new FormData();
              form.set("kind", "task");
              form.set("title", reminderNote.trim() || "Account Reminder");
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
              Assign Owner Is Not Wired For Accounts Yet (No Owner Column). Coming Next Wave.
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
              {/* TODO(businesses): standalone Archive menu uses same columns as merge — wire next wave. */}
              Standalone Archive Is Not Wired Yet. Use Merge Accounts To Archive A Duplicate.
            </DialogDescription>
          </DialogHeader>
          <Button type="button" size="sm" variant="outline" onClick={() => setArchiveOpen(false)}>
            Close
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog
        open={mergeOpen}
        onOpenChange={(next) => {
          setMergeOpen(next);
          if (!next) resetMerge();
        }}
      >
        <DialogContent className="sm:max-w-2xl" data-ff-business-merge-dialog="">
          <DialogHeader>
            <DialogTitle>Merge Accounts</DialogTitle>

          </DialogHeader>

          {!pickedId ? (
            <>
              <Input
                placeholder="Search Name, DBA, Email, Phone…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-8"
              />
              {error ? <p className="text-sm text-[#BF0A30]">{error}</p> : null}
              <ul className="max-h-56 space-y-1 overflow-y-auto text-sm">
                {hits.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left hover:bg-muted"
                      onClick={async () => {
                        setError(null);
                        setPickedId(row.id);
                        setPickedLabel(row.name);
                        setSurvivorId("this");
                        const ok = await loadPreviewForSurvivor(row.id, false);
                        if (!ok) {
                          setPickedId(null);
                          setPickedLabel("");
                        }
                      }}
                    >
                      <span className="font-medium text-[#002868]">{row.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {row.dba || row.email || row.phone || ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="space-y-3" data-ff-business-merge-diff="">
              <div className="space-y-2 rounded-md border border-border p-3 text-sm">
                <p className="font-medium text-[#002868]">Pick Surviving Record</p>
                <label className="flex items-start gap-2">
                  <input
                    type="radio"
                    name="survivor"
                    checked={survivorId === "this"}
                    onChange={async () => {
                      setSurvivorId("this");
                      setError(null);
                      await loadPreviewForSurvivor(pickedId, false);
                    }}
                  />
                  <span>
                    Keep This Account
                    {accountName ? (
                      <>
                        {" "}
                        (<strong>{accountName}</strong>
                      </>
                    ) : null}
                  </span>
                </label>
                <label className="flex items-start gap-2">
                  <input
                    type="radio"
                    name="survivor"
                    checked={survivorId === "other"}
                    onChange={async () => {
                      setSurvivorId("other");
                      setError(null);
                      await loadPreviewForSurvivor(pickedId, true);
                    }}
                  />
                  <span>
                    Keep <strong>{pickedLabel}</strong>
                  </span>
                </label>
              </div>

              <div className="max-h-72 overflow-y-auto rounded-md border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-muted/80 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1.5">Field</th>
                      <th className="px-2 py-1.5">Survivor</th>
                      <th className="px-2 py-1.5">Merged</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row) => {
                      const key = LABEL_TO_KEY[row.field];
                      const choice = key ? (picks[key] ?? "keeper") : "keeper";
                      return (
                        <tr key={row.field} className="border-t border-border">
                          <td className="px-2 py-1.5 font-medium text-[#002868]">{row.field}</td>
                          <td className="px-2 py-1.5">
                            {key ? (
                              <label className="inline-flex items-start gap-1.5">
                                <input
                                  type="radio"
                                  name={`pick-${key}`}
                                  checked={choice === "keeper"}
                                  onChange={() => setPicks((p) => ({ ...p, [key]: "keeper" }))}
                                />
                                <span>{row.keeper}</span>
                              </label>
                            ) : (
                              row.keeper
                            )}
                          </td>
                          <td className="px-2 py-1.5">
                            {key ? (
                              <label className="inline-flex items-start gap-1.5">
                                <input
                                  type="radio"
                                  name={`pick-${key}`}
                                  checked={choice === "duplicate"}
                                  onChange={() => setPicks((p) => ({ ...p, [key]: "duplicate" }))}
                                />
                                <span>{row.duplicate}</span>
                              </label>
                            ) : (
                              row.duplicate
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {error ? <p className="text-sm text-[#BF0A30]">{error}</p> : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPickedId(null);
                    setPickedLabel("");
                    setPreviewRows([]);
                    setPicks({});
                    setSurvivorId("this");
                  }}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="hover:!bg-fit-red hover:!text-white"
                  disabled={merging}
                  onClick={async () => {
                    setMerging(true);
                    setError(null);
                    try {
                      const keeperId = survivorId === "other" ? pickedId : accountId;
                      const duplicateId = survivorId === "other" ? accountId : pickedId;
                      const form = new FormData();
                      form.set("keeperId", keeperId);
                      form.set("duplicateId", duplicateId);
                      form.set("picks", JSON.stringify(picks));
                      const result = await mergeBusinessIntoSurvivor(form);
                      if (!result.ok) {
                        setError(result.error ?? "Merge Failed.");
                        return;
                      }
                      setMergeOpen(false);
                      resetMerge();
                      if (result.keeperId !== accountId) {
                        router.push(`/accounts/${result.keeperId}`);
                      } else {
                        router.refresh();
                      }
                    } finally {
                      setMerging(false);
                    }
                  }}
                >
                  {merging ? "Merging…" : "Merge And Archive"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
