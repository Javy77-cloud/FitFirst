"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
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

/** Compact linked-contacts glance line — mirrors Contacts LinkedBusinessLine chrome. */
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

  const primary = contacts[0];
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm" data-ff-linked-contacts="">
      <span className="text-muted-foreground">Contacts</span>
      {primary ? (
        <>
          {contacts.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-1"
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
                <Button
                  type="submit"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-[#BF0A30]"
                >
                  Unlink
                </Button>
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
        </>
      ) : (
        <>
          <span className="text-muted-foreground">No Linked Contacts Yet — Link One.</span>
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
        </>
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
