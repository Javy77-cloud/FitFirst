"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createContactPopup, searchContactsForLink } from "@/app/actions/contacts-ops";
import { linkInboxContact } from "@/app/actions/inbox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { parseEmailFrom } from "@/lib/home/lead-offers";

type ContactHit = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
};

export function InboxLinkContactDialog({
  threadId,
  from,
  email,
}: {
  threadId: string;
  from: string;
  email: string;
}) {
  const router = useRouter();
  const parsed = parseEmailFrom(from || email);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "link">("link");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<ContactHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState(parsed.firstName === "Unknown" ? "" : parsed.firstName);
  const [lastName, setLastName] = useState(parsed.lastName === "Lead" ? "" : parsed.lastName);
  const debounced = useDebouncedValue(query);

  useEffect(() => {
    if (!open || mode !== "link") return;
    const q = debounced.trim();
    if (!q) {
      setHits([]);
      return;
    }
    let cancelled = false;
    void searchContactsForLink(q).then((rows) => {
      if (!cancelled) setHits(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [debounced, mode, open]);

  async function link(contactId: string) {
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.set("threadId", threadId);
    form.set("contactId", contactId);
    form.set("email", parsed.email || email);
    const result = await linkInboxContact(form);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  async function create() {
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.set("firstName", firstName);
    form.set("lastName", lastName);
    if (parsed.email || email) form.set("email", parsed.email || email);
    form.set("source", "inbox");
    const result = await createContactPopup(form);
    setBusy(false);
    if (result.ok) {
      setOpen(false);
      router.refresh();
      return;
    }
    if ("existingId" in result && result.existingId) {
      await link(result.existingId);
      return;
    }
    setError("Could not create that contact.");
  }

  return (
    <>
      <button type="button" className="ff-panel-ghost" onClick={() => setOpen(true)} data-ff-inbox-link-contact="">
        Link or create contact
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" data-ff-inbox-link-dialog="">
          <DialogHeader>
            <DialogTitle>Link or create contact</DialogTitle>

          </DialogHeader>
          <div className="flex gap-2" role="tablist" aria-label="Link or create">
            <Button
              type="button"
              size="sm"
              variant={mode === "link" ? "default" : "outline"}
              onClick={() => setMode("link")}
              data-ff-inbox-link-mode="link"
            >
              Link to existing
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "create" ? "default" : "outline"}
              onClick={() => setMode("create")}
              data-ff-inbox-link-mode="create"
            >
              Create new
            </Button>
          </div>
          {mode === "link" ? (
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-navy">
                Search contacts
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Type a name…"
                  className="mt-1 h-8"
                  autoComplete="off"
                  data-ff-inbox-contact-search=""
                />
              </label>
              <ul className="max-h-56 overflow-auto rounded-md border border-border" data-ff-inbox-contact-hits="">
                {hits.length === 0 ? null : (
                  hits.map((hit) => (
                    <li key={hit.id}>
                      <button
                        type="button"
                        className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-secondary disabled:opacity-60"
                        disabled={busy}
                        onClick={() => void link(hit.id)}
                      >
                        <span className="font-medium text-navy">
                          {hit.lastName}, {hit.firstName}
                        </span>
                        {hit.email ? <span className="text-xs text-muted-foreground">{hit.email}</span> : null}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          ) : (
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-navy">
                First name
                <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} className="mt-1 h-8" />
              </label>
              <label className="text-xs font-semibold text-navy">
                Last name
                <Input value={lastName} onChange={(event) => setLastName(event.target.value)} className="mt-1 h-8" />
              </label>
              <p className="text-xs text-muted-foreground">{parsed.email || email || "No email on this message."}</p>
              <Button type="button" size="sm" disabled={busy} onClick={() => void create()}>
                Create contact
              </Button>
            </div>
          )}
          {error ? <p className="text-sm text-navy">{error}</p> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
