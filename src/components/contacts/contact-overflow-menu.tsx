"use client";

import { ProcessingLabel } from "@/components/desk/wait-hold";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { updateContactRecord } from "@/app/actions/record-edit";
import {
  loadContactMergePreview,
  mergeContactIntoSurvivor,
  searchContactsForLink,
} from "@/app/actions/contacts-ops";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { fieldBuilderHref } from "@/lib/custom-fields/modules";
import { ContactLayoutTemplatePicker } from "@/components/contacts/contact-layout-template-picker";
import { RecordTags } from "@/components/tags/record-tags";
import { colorsFromModuleTags } from "@/lib/tags/tag-colors";
import { suggestedTagsFor } from "@/lib/tags/module-tags";

const LABEL_TO_KEY: Record<string, string> = {
  "First name": "firstName",
  "Last name": "lastName",
  Email: "email",
  Phone: "phone",
  "Mailing address": "mailingAddress",
  City: "city",
  State: "state",
  ZIP: "zip",
  "Date of birth": "dateOfBirth",
  Notes: "notes",
  "Life notes": "lifeNotes",
  "Health notes": "healthNotes",
  Source: "source",
};

type PreviewRow = {
  field: string;
  keeper: string;
  duplicate: string;
  action: "keep" | "copy" | "append";
};

export function ContactOverflowMenu({
  contactId,
  emailOptOut,
  smsOptOut,
  tags,
  tagExtra = [],
}: {
  contactId: string;
  emailOptOut: boolean;
  smsOptOut: boolean;
  tags?: string[] | null;
  tagExtra?: { name: string; color: string | null }[];
}) {
  const router = useRouter();
  const [mergeOpen, setMergeOpen] = useState(false);
  const [optOpen, setOptOpen] = useState(false);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<
    { id: string; firstName: string; lastName: string; email: string | null }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [dupLabel, setDupLabel] = useState("");
  const [picks, setPicks] = useState<Record<string, "keeper" | "duplicate">>({});
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    if (!mergeOpen) return;
    let cancelled = false;
    void searchContactsForLink(q, contactId).then((rows) => {
      if (!cancelled) setHits(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [mergeOpen, q, contactId]);

  function resetMerge() {
    setQ("");
    setHits([]);
    setError(null);
    setPickedId(null);
    setPreviewRows([]);
    setDupLabel("");
    setPicks({});
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          type="button"
          aria-label="More"
          data-ff-contact-overflow=""
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-sm hover:bg-muted"
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[11rem]">
          <DropdownMenuItem onClick={() => setTagsOpen(true)}>Tags</DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              window.location.href = fieldBuilderHref("contacts");
            }}
          >
            Edit Layout
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setLayoutOpen(true)}>Layout Templates</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setMergeOpen(true)}>Merge</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setOptOpen(true)}>Opt-Out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={tagsOpen} onOpenChange={setTagsOpen}>
        <DialogContent className="sm:max-w-md" data-ff-contact-tags-dialog="">
          <DialogHeader>
            <DialogTitle>Tags</DialogTitle>

          </DialogHeader>
          <RecordTags
            module="contacts"
            recordId={contactId}
            tags={tags}
            suggestions={suggestedTagsFor(
              "contacts",
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
            <ContactLayoutTemplatePicker
              key="contact-layout-templates"
              contactId={contactId}
              onApplied={() => setLayoutOpen(false)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={mergeOpen}
        onOpenChange={(next) => {
          setMergeOpen(next);
          if (!next) resetMerge();
        }}
      >
        <DialogContent className="sm:max-w-2xl" data-ff-contact-merge-dialog="">
          <DialogHeader>
            <DialogTitle>Merge Contacts</DialogTitle>

          </DialogHeader>

          {!pickedId ? (
            <>
              <Input
                placeholder="Search Name, Email, Phone…"
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
                        const preview = await loadContactMergePreview(contactId, row.id);
                        if (!preview.ok) {
                          setError(preview.error ?? "Preview Failed.");
                          return;
                        }
                        setPickedId(row.id);
                        setDupLabel(`${row.lastName}, ${row.firstName}`);
                        setPreviewRows(preview.rows);
                        const initial: Record<string, "keeper" | "duplicate"> = {};
                        for (const r of preview.rows) {
                          const key = LABEL_TO_KEY[r.field];
                          if (!key) continue;
                          initial[key] = r.action === "copy" || r.action === "append" ? "duplicate" : "keeper";
                        }
                        setPicks(initial);
                      }}
                    >
                      <span>
                        {row.lastName}, {row.firstName}
                      </span>
                      <span className="text-xs text-muted-foreground">{row.email ?? ""}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="space-y-3" data-ff-contact-merge-diff="">
              <p className="text-sm text-muted-foreground">
                Survivor stays this contact. Merging <strong>{dupLabel}</strong>.
              </p>
              <div className="max-h-72 overflow-y-auto rounded-md border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-muted/80 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1.5">Field</th>
                      <th className="px-2 py-1.5">This Contact</th>
                      <th className="px-2 py-1.5">Duplicate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row) => {
                      const key = LABEL_TO_KEY[row.field];
                      const choice = key ? picks[key] ?? "keeper" : "keeper";
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
                    setPreviewRows([]);
                    setPicks({});
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
                      const form = new FormData();
                      form.set("keeperId", contactId);
                      form.set("duplicateId", pickedId);
                      form.set("picks", JSON.stringify(picks));
                      const result = await mergeContactIntoSurvivor(form);
                      if (!result.ok) {
                        setError(result.error ?? "Merge Failed.");
                        return;
                      }
                      setMergeOpen(false);
                      resetMerge();
                      router.refresh();
                    } finally {
                      setMerging(false);
                    }
                  }}
                >
                  {merging ? <ProcessingLabel>Merging…</ProcessingLabel> : "Merge And Archive"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={optOpen} onOpenChange={setOptOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Opt-Out</DialogTitle>

          </DialogHeader>
          <form
            action={async (fd) => {
              fd.set("contactId", contactId);
              fd.set("saveOptOuts", "1");
              await updateContactRecord(fd);
              setOptOpen(false);
              router.refresh();
            }}
            className="space-y-3"
          >
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="emailOptOut" defaultChecked={emailOptOut} />
              Email Opt-Out
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="smsOptOut" defaultChecked={smsOptOut} />
              SMS Opt-Out
            </label>
            <Button type="submit" size="sm" className="hover:!bg-fit-red hover:!text-white">
              Save Opt-Out
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
