"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { updateContactRecord } from "@/app/actions/record-edit";
import { mergeContactIntoSurvivor, searchContactsForLink } from "@/app/actions/contacts-ops";
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
import { fieldBuilderHref } from "@/lib/custom-fields/modules";
import { ContactLayoutTemplatePicker } from "@/components/contacts/contact-layout-template-picker";

export function ContactOverflowMenu({
  contactId,
  emailOptOut,
  smsOptOut,
}: {
  contactId: string;
  emailOptOut: boolean;
  smsOptOut: boolean;
}) {
  const router = useRouter();
  const [mergeOpen, setMergeOpen] = useState(false);
  const [optOpen, setOptOpen] = useState(false);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<
    { id: string; firstName: string; lastName: string; email: string | null }[]
  >([]);
  const [error, setError] = useState<string | null>(null);

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

      <Dialog open={layoutOpen} onOpenChange={setLayoutOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Layout Templates</DialogTitle>
            <DialogDescription>
              Classic (single dense) or Card (two-column). Saved per browser for v1.
            </DialogDescription>
          </DialogHeader>
          <ContactLayoutTemplatePicker contactId={contactId} onApplied={() => setLayoutOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
        <DialogContent className="sm:max-w-md" data-ff-contact-merge-dialog="">
          <DialogHeader>
            <DialogTitle>Merge Contacts</DialogTitle>
            <DialogDescription>
              This contact stays as the survivor. The other is archived after fields and links move
              over.
            </DialogDescription>
          </DialogHeader>
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
                    const form = new FormData();
                    form.set("keeperId", contactId);
                    form.set("duplicateId", row.id);
                    const result = await mergeContactIntoSurvivor(form);
                    if (!result.ok) {
                      setError(result.error ?? "Merge failed.");
                      return;
                    }
                    setMergeOpen(false);
                    router.refresh();
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
        </DialogContent>
      </Dialog>

      <Dialog open={optOpen} onOpenChange={setOptOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Opt-Out</DialogTitle>
            <DialogDescription>Held on the contact. Queue will not send when flagged.</DialogDescription>
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
