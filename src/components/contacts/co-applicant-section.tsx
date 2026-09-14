"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  linkContactCoapplicant,
  searchContactsForLink,
  unlinkContactCoapplicant,
} from "@/app/actions/contacts-ops";
import { CollapsibleSection } from "@/components/contacts/collapsible-section";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type CoRow = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
};

export function CoApplicantSection({
  contactId,
  coApplicants,
}: {
  contactId: string;
  coApplicants: CoRow[];
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [hits, setHits] = useState<CoRow[]>([]);
  const [openSearch, setOpenSearch] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 180);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!openSearch) return;
    let cancelled = false;
    void searchContactsForLink(debounced, contactId).then((rows) => {
      if (!cancelled) setHits(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [debounced, contactId, openSearch]);

  const emptyHint = useMemo(() => {
    if (!debounced) return "Type a name, email, or phone…";
    if (hits.length === 0) return "No Matches.";
    return null;
  }, [debounced, hits.length]);

  return (
    <CollapsibleSection
      title="Co-Applicants"
      badge={coApplicants.length || undefined}
      defaultOpen={false}
      data-ff="contact-coapplicants"
    >
      {coApplicants.length === 0 ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>No Co-Applicants Yet — Add One.</span>
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-[#002868] hover:bg-muted"
            aria-label="Link Co-Applicant"
            onClick={() => setOpenSearch(true)}
          >
            <Plus className="size-4" />
          </button>
        </div>
      ) : (
        <ul className="space-y-2 text-sm">
          {coApplicants.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <Link
                  href={`/contacts/${row.id}`}
                  className="font-medium text-[#002868] hover:underline"
                  data-ff-coapplicant-name=""
                >
                  {row.lastName}, {row.firstName}
                </Link>
                <div className="text-xs text-muted-foreground">
                  {[row.email, row.phone].filter(Boolean).join(" · ") || "No Contact Info"}
                </div>
              </div>
              <form
                action={async () => {
                  const fd = new FormData();
                  fd.set("contactId", contactId);
                  fd.set("linkedContactId", row.id);
                  await unlinkContactCoapplicant(fd);
                  router.refresh();
                }}
              >
                <Button type="submit" size="sm" variant="ghost" className="h-7 text-xs text-[#BF0A30]">
                  Unlink
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {coApplicants.length > 0 ? (
        <div className="mt-3">
          <Button type="button" size="sm" variant="outline" onClick={() => setOpenSearch(true)}>
            Link Co-Applicant
          </Button>
        </div>
      ) : null}

      <Dialog
        open={openSearch}
        onOpenChange={(next) => {
          setOpenSearch(next);
          if (!next) {
            setQ("");
            setHits([]);
          }
        }}
      >
        <DialogContent className="sm:max-w-md" data-ff-coapplicant-search-dialog="">
          <DialogHeader>
            <DialogTitle>Link Co-Applicant</DialogTitle>
            <DialogDescription>
              Search an existing contact by name. Policies stay on their own page.
            </DialogDescription>
          </DialogHeader>
          <Input
            className="h-8"
            placeholder="Search Name, Email, Phone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
          {emptyHint ? <p className="text-sm text-muted-foreground">{emptyHint}</p> : null}
          <ul className="max-h-56 space-y-1 overflow-y-auto text-sm">
            {hits.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  disabled={busy}
                  className="flex w-full flex-col rounded px-2 py-1.5 text-left hover:bg-muted disabled:opacity-50"
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const fd = new FormData();
                      fd.set("contactId", contactId);
                      fd.set("linkedContactId", row.id);
                      await linkContactCoapplicant(fd);
                      setOpenSearch(false);
                      setQ("");
                      router.refresh();
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <span className="font-medium text-[#002868]">
                    {row.lastName}, {row.firstName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {[row.email, row.phone].filter(Boolean).join(" · ")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </CollapsibleSection>
  );
}
