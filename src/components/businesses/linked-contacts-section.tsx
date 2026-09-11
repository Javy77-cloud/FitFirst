"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import {
  linkContactBusiness,
  searchContactsForLink,
  unlinkContactBusiness,
} from "@/app/actions/contacts-ops";
import { RecordLink } from "@/components/record-links";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type LinkedContact = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
};

export function LinkedContactsSection({
  accountId,
  contacts,
}: {
  accountId: string;
  contacts: LinkedContact[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<
    { id: string; firstName: string; lastName: string; email: string | null }[]
  >([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void searchContactsForLink(q).then((rows) => {
      if (!cancelled) {
        const linked = new Set(contacts.map((c) => c.id));
        setHits(rows.filter((r) => !linked.has(r.id)));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, q, contacts]);

  return (
    <div data-ff-linked-contacts="">
      {contacts.length === 0 ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>No Linked Contacts Yet — Link One.</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1"
            onClick={() => setOpen(true)}
          >
            <Plus className="size-3.5" />
            Link Contact
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {contacts.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-sm"
              data-ff-linked-contact-chip={c.id}
            >
              <RecordLink href={`/contacts/${c.id}`}>
                {c.lastName}, {c.firstName}
              </RecordLink>
              <form
                action={async () => {
                  const fd = new FormData();
                  fd.set("contactId", c.id);
                  fd.set("accountId", accountId);
                  await unlinkContactBusiness(fd);
                  router.refresh();
                }}
              >
                <button
                  type="submit"
                  className="rounded-full p-0.5 text-muted-foreground hover:bg-[#BF0A30]/10 hover:text-[#BF0A30]"
                  aria-label={`Unlink ${c.firstName} ${c.lastName}`}
                >
                  <X className="size-3.5" />
                </button>
              </form>
            </span>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1"
            onClick={() => setOpen(true)}
          >
            <Plus className="size-3.5" />
            Link Contact
          </Button>
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQ("");
        }}
      >
        <DialogContent className="sm:max-w-md" data-ff-link-contact-dialog="">
          <DialogHeader>
            <DialogTitle>Link Contact</DialogTitle>
            <DialogDescription>
              Search An Existing Contact. A Contact Can Link To Multiple Businesses.
            </DialogDescription>
          </DialogHeader>
          <Input
            className="h-8"
            placeholder="Search Name, Email, Phone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
          <ul className="max-h-56 space-y-1 overflow-y-auto text-sm">
            {hits.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left hover:bg-muted"
                  onClick={async () => {
                    const fd = new FormData();
                    fd.set("contactId", row.id);
                    fd.set("accountId", accountId);
                    await linkContactBusiness(fd);
                    setOpen(false);
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
            {hits.length === 0 ? (
              <li className="px-2 py-3 text-sm text-muted-foreground">No Matches.</li>
            ) : null}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}
