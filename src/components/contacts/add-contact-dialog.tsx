"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createContactPopup } from "@/app/actions/contacts-ops";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SourceSelect } from "@/components/crm/source-select";
import {
  contactMatchLabel,
  contactMatchReasonText,
  findExistingContactMatch,
  type ExistingContactRow,
} from "@/lib/crm/existing-contact-match";
import { cn } from "@/lib/utils";

export function AddContactDialog({ contacts }: { contacts: ExistingContactRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [referral, setReferral] = useState("");
  const [lifeNotes, setLifeNotes] = useState("");
  const [healthNotes, setHealthNotes] = useState("");
  const [pcNotes, setPcNotes] = useState("");
  const [forceCreate, setForceCreate] = useState(false);
  const [matchOpen, setMatchOpen] = useState(false);
  const [softDup, setSoftDup] = useState<{ id: string; label: string } | null>(null);

  const match = useMemo(
    () =>
      findExistingContactMatch(contacts, {
        firstName,
        lastName,
        email: email || null,
        phone: phone || null,
      }),
    [contacts, firstName, lastName, email, phone],
  );

  function reset() {
    setFirstName("");
    setMiddleName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setReferral("");
    setLifeNotes("");
    setHealthNotes("");
    setPcNotes("");
    setForceCreate(false);
    setMatchOpen(false);
    setSoftDup(null);
  }

  async function submit(force = false) {
    setBusy(true);
    setSoftDup(null);
    try {
      const fd = new FormData();
      fd.set("firstName", firstName);
      fd.set("middleName", middleName);
      fd.set("lastName", lastName);
      fd.set("email", email);
      fd.set("phone", phone);
      fd.set("referral", referral);
      fd.set("lifeNotes", lifeNotes);
      fd.set("healthNotes", healthNotes);
      fd.set("pcNotes", pcNotes);
      const sourceEl = document.querySelector<HTMLSelectElement | HTMLInputElement>(
        '[data-ff-add-contact-dialog] [name="source"]',
      );
      if (sourceEl?.value) fd.set("source", sourceEl.value);
      if (force || forceCreate) fd.set("forceCreate", "1");
      const result = await createContactPopup(fd);
      if (!result.ok && "duplicate" in result && result.duplicate) {
        setSoftDup({ id: result.existingId, label: result.existingLabel });
        setMatchOpen(true);
        return;
      }
      if (result.ok) {
        setOpen(false);
        reset();
        router.refresh();
        router.push(`/contacts/${result.id}`);
      }
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (match && !forceCreate) {
      setMatchOpen(true);
      return;
    }
    void submit(forceCreate);
  }

  return (
    <>
      <Button
        type="button"
        className={cn("hover:!bg-fit-red hover:!text-white hover:!border-fit-red")}
        data-ff-new-contact=""
        onClick={() => setOpen(true)}
      >
        New Contact
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent
          className="w-[min(100%-2rem,520px)] max-w-[520px] gap-3 p-5 sm:max-w-[520px]"
          data-ff-add-contact-dialog=""
        >
          <DialogHeader>
            <DialogTitle>New Contact</DialogTitle>
            <DialogDescription>
              Quick add. Bind / Closed Won still creates or links a contact automatically.
            </DialogDescription>
          </DialogHeader>

          {softDup || match ? (
            <div
              className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950"
              data-ff-contact-dup-banner=""
            >
              Possible duplicate:{" "}
              <Link
                href={`/contacts/${softDup?.id ?? match?.contact.id}`}
                className="font-semibold underline"
                onClick={() => setOpen(false)}
              >
                {softDup?.label ?? (match ? contactMatchLabel(match) : "")}
              </Link>
              . You can still create.
            </div>
          ) : null}

          <form className="space-y-3" onSubmit={onSubmit}>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="ff-contact-first" className="text-xs">
                  First Name
                </Label>
                <Input
                  id="ff-contact-first"
                  name="firstName"
                  required
                  className="mt-1 h-8"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ff-contact-middle" className="text-xs">
                  Middle Name
                </Label>
                <Input
                  id="ff-contact-middle"
                  name="middleName"
                  className="mt-1 h-8"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ff-contact-last" className="text-xs">
                  Last Name
                </Label>
                <Input
                  id="ff-contact-last"
                  name="lastName"
                  required
                  className="mt-1 h-8"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ff-contact-email" className="text-xs">
                  Email
                </Label>
                <Input
                  id="ff-contact-email"
                  name="email"
                  type="email"
                  className="mt-1 h-8"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ff-contact-phone" className="text-xs">
                  Phone
                </Label>
                <Input
                  id="ff-contact-phone"
                  name="phone"
                  className="mt-1 h-8"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ff-contact-referral" className="text-xs">
                  Referral
                </Label>
                <Input
                  id="ff-contact-referral"
                  name="referral"
                  className="mt-1 h-8"
                  value={referral}
                  onChange={(e) => setReferral(e.target.value)}
                />
              </div>
            </div>
            <SourceSelect defaultValue="referral" />
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="ff-life-notes" className="text-xs">
                  Life Notes
                </Label>
                <Textarea
                  id="ff-life-notes"
                  name="lifeNotes"
                  className="mt-1 min-h-[64px]"
                  value={lifeNotes}
                  onChange={(e) => setLifeNotes(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ff-health-notes" className="text-xs">
                  Health Notes
                </Label>
                <Textarea
                  id="ff-health-notes"
                  name="healthNotes"
                  className="mt-1 min-h-[64px]"
                  value={healthNotes}
                  onChange={(e) => setHealthNotes(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ff-pc-notes" className="text-xs">
                  P&C Notes
                </Label>
                <Textarea
                  id="ff-pc-notes"
                  name="pcNotes"
                  className="mt-1 min-h-[64px]"
                  value={pcNotes}
                  onChange={(e) => setPcNotes(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <Link
                href="/contacts/new"
                className="text-sm text-primary hover:underline"
                onClick={() => setOpen(false)}
              >
                Use Full Layout
              </Link>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={busy} data-ff-save-contact-popup="">
                  Save Contact
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={matchOpen} onOpenChange={setMatchOpen}>
        <DialogContent
          className="w-[min(100%-2rem,420px)] max-w-[420px] gap-3 p-5 sm:max-w-[420px]"
          data-ff-existing-contact-dialog="add"
        >
          <DialogHeader>
            <DialogTitle>This Contact Already Exists</DialogTitle>
            <DialogDescription>
              {match
                ? `Found ${contactMatchLabel(match)} (${contactMatchReasonText(match.reason)}). Open that contact instead of creating another?`
                : softDup
                  ? `Found ${softDup.label}. Open that contact instead of creating another?`
                  : "A matching contact is already on the book."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              data-ff-open-existing-contact=""
              onClick={() => {
                const id = softDup?.id ?? match?.contact.id;
                if (!id) return;
                setMatchOpen(false);
                setOpen(false);
                router.push(`/contacts/${id}`);
              }}
            >
              Yes, Open Existing
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              data-ff-force-create-contact=""
              onClick={() => {
                setMatchOpen(false);
                setForceCreate(true);
                void submit(true);
              }}
            >
              No, Create Anyway
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
