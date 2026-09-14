"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  linkContactBusiness,
  searchBusinessesForLink,
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

export function LinkedBusinessLine({
  contactId,
  businesses,
}: {
  contactId: string;
  businesses: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void searchBusinessesForLink(q).then((rows) => {
      if (!cancelled) setHits(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [open, q]);

  const primary = businesses[0];
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm" data-ff-linked-business-line="">
      <span className="text-muted-foreground">Business</span>
      {primary ? (
        <>
          <RecordLink href={`/accounts/${primary.id}`}>{primary.name}</RecordLink>
          <form
            action={async () => {
              const fd = new FormData();
              fd.set("contactId", contactId);
              fd.set("accountId", primary.id);
              await unlinkContactBusiness(fd);
              router.refresh();
            }}
          >
            <Button type="submit" size="sm" variant="ghost" className="h-7 px-2 text-xs text-[#BF0A30]">
              Unlink
            </Button>
          </form>
          {businesses.length > 1 ? (
            <span className="text-xs text-muted-foreground">+{businesses.length - 1} More</span>
          ) : null}
        </>
      ) : (
        <>
          <span className="text-muted-foreground">No Business Yet — Add One.</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1"
            onClick={() => setOpen(true)}
          >
            <Plus className="size-3.5" />
            Link Business
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
        <DialogContent className="sm:max-w-md" data-ff-link-business-dialog="">
          <DialogHeader>
            <DialogTitle>Link Business</DialogTitle>
            <DialogDescription>Search an existing business account.</DialogDescription>
          </DialogHeader>
          <Input
            className="h-8"
            placeholder="Search Business…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
          <ul className="max-h-56 space-y-1 overflow-y-auto text-sm">
            {hits.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  className="w-full rounded px-2 py-1.5 text-left hover:bg-muted"
                  onClick={async () => {
                    const fd = new FormData();
                    fd.set("contactId", contactId);
                    fd.set("accountId", row.id);
                    await linkContactBusiness(fd);
                    setOpen(false);
                    router.refresh();
                  }}
                >
                  {row.name}
                </button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}
