"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  contactMatchLabel,
  contactMatchReasonText,
  contactPrefillForLayout,
  findExistingContactMatch,
  identityFromLayoutFields,
  type ExistingContactRow,
} from "@/lib/crm/existing-contact-match";

type ModuleKind = "leads" | "deals" | "contacts";

export function LinkExistingContactGuard({
  module,
  contacts,
  children,
  className,
  action,
  "data-ff": dataFf,
}: {
  module: ModuleKind;
  contacts: ExistingContactRow[];
  children: ReactNode;
  className?: string;
  action: (formData: FormData) => void | Promise<void>;
  "data-ff"?: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [pendingMatch, setPendingMatch] = useState<{
    id: string;
    label: string;
    reason: string;
    prefill: Record<string, string>;
  } | null>(null);
  const skipRef = useRef(false);

  function readIdentity(form: HTMLFormElement) {
    const data = new FormData(form);
    return identityFromLayoutFields((key) => {
      const fromField = String(data.get(`field_${key}`) ?? "").trim();
      if (fromField) return fromField;
      return String(data.get(key) ?? "").trim();
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (skipRef.current) {
      skipRef.current = false;
      return;
    }
    const form = event.currentTarget;
    const data = new FormData(form);
    if (module !== "contacts" && String(data.get("contactId") ?? "").trim()) return;

    const identity = readIdentity(form);
    const match = findExistingContactMatch(contacts, identity);
    if (!match) return;

    event.preventDefault();
    setPendingMatch({
      id: match.contact.id,
      label: contactMatchLabel(match),
      reason: contactMatchReasonText(match.reason),
      prefill: contactPrefillForLayout(match.contact),
    });
    setOpen(true);
  }

  function fillEmptyFromContact(prefill: Record<string, string>) {
    const form = formRef.current;
    if (!form) return;
    for (const [key, value] of Object.entries(prefill)) {
      if (!value) continue;
      const input = form.elements.namedItem(`field_${key}`) as
        | HTMLInputElement
        | HTMLTextAreaElement
        | HTMLSelectElement
        | null;
      if (!input) continue;
      if (String(input.value ?? "").trim()) continue;
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  function linkAndSubmit() {
    const form = formRef.current;
    if (!form || !pendingMatch) return;
    if (module === "contacts") {
      setOpen(false);
      router.push(`/contacts/${pendingMatch.id}`);
      return;
    }
    let hidden = form.querySelector<HTMLInputElement>('input[name="contactId"]');
    if (!hidden) {
      hidden = document.createElement("input");
      hidden.type = "hidden";
      hidden.name = "contactId";
      form.appendChild(hidden);
    }
    hidden.value = pendingMatch.id;
    fillEmptyFromContact(pendingMatch.prefill);
    setOpen(false);
    skipRef.current = true;
    form.requestSubmit();
  }

  function continueWithoutLink() {
    setOpen(false);
    setPendingMatch(null);
    skipRef.current = true;
    formRef.current?.requestSubmit();
  }

  const noun = module === "deals" ? "deal" : module === "contacts" ? "contact" : "lead";
  const yesLabel = module === "contacts" ? "Yes, Open Existing" : "Yes, Link Contact";
  const noLabel = module === "contacts" ? "No, Create Anyway" : "No, Keep Separate";
  const description = pendingMatch
    ? module === "contacts"
      ? `Found ${pendingMatch.label} (${pendingMatch.reason}). Open that contact instead of creating another?`
      : `Found ${pendingMatch.label} (${pendingMatch.reason}). Link this ${noun} to that contact?`
    : module === "contacts"
      ? "A matching contact is already on the book. Open it instead?"
      : `A matching contact is already on the book. Link this ${noun}?`;

  return (
    <>
      <form
        ref={formRef}
        action={action}
        className={className}
        data-ff={dataFf}
        data-ff-new-lead-layout={module === "leads" ? "" : undefined}
        data-ff-new-deal-layout={module === "deals" ? "" : undefined}
        data-ff-new-contact-layout={module === "contacts" ? "" : undefined}
        data-ff-link-contact-guard={module}
        onSubmit={onSubmit}
      >
        {module !== "contacts" ? (
          <input type="hidden" name="contactId" defaultValue="" />
        ) : null}
        {children}
      </form>

      <Dialog open={open} onOpenChange={(next) => { if (!next) setOpen(false); }}>
        <DialogContent
          className="w-[min(100%-2rem,420px)] max-w-[420px] gap-3 p-5 sm:max-w-[420px]"
          data-ff-existing-contact-dialog=""
        >
          <DialogHeader>
            <DialogTitle>This Contact Already Exists</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={linkAndSubmit}
              data-ff-link-contact-yes=""
            >
              {yesLabel}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={continueWithoutLink}
              data-ff-link-contact-no=""
            >
              {noLabel}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
