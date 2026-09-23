"use client";

import { useEffect, useRef, useState, useTransition, type ClipboardEvent } from "react";
import { Bold, Italic, Paperclip, Type } from "lucide-react";
import { sendDeskEmail } from "@/app/actions/comms";
import {
  loadQuickCommsEmailSignature,
  resolveComposeOpenPrefill,
  searchComposeRecipients,
  type ComposeRecipientHit,
} from "@/app/actions/quick-comms-email";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";

export type QuickCommsComposeRelated = {
  dealId?: string | null;
  leadId?: string | null;
  contactId?: string | null;
  accountId?: string | null;
  policyId?: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toAddress: string;
  contactName: string;
  related: QuickCommsComposeRelated;
  initialSubject?: string;
  initialBody?: string;
  templateId?: string | null;
  /** fixed = Quick Comms (read-only To). search = Inbox live CRM typeahead. */
  toMode?: "fixed" | "search";
  onSent?: () => void;
  stayHint?: string;
};

const FONT_SIZES = [
  { label: "S", value: "2" },
  { label: "M", value: "3" },
  { label: "L", value: "5" },
] as const;

const COLORS = ["#0b1f33", "#b45309", "#b91c1c", "#047857", "#1d4ed8"] as const;

function htmlToPlain(html: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent ?? "").replace(/\u00a0/g, " ").trim();
}

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function QuickCommsEmailCompose({
  open,
  onOpenChange,
  toAddress: toAddressProp,
  contactName: contactNameProp,
  related: relatedProp,
  initialSubject,
  initialBody,
  templateId = null,
  toMode = "fixed",
  onSent,
  stayHint,
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [subject, setSubject] = useState(initialSubject ?? "");
  const [signature, setSignature] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [toDraft, setToDraft] = useState(toAddressProp);
  const [pickedName, setPickedName] = useState(contactNameProp);
  const [related, setRelated] = useState<QuickCommsComposeRelated>(relatedProp);
  const [hits, setHits] = useState<ComposeRecipientHit[]>([]);
  const [listOpen, setListOpen] = useState(false);
  const debouncedTo = useDebouncedValue(toDraft);

  const toAddress = toMode === "search" ? toDraft.trim() : toAddressProp;

  useEffect(() => {
    if (!open) return;
    setSubject(initialSubject ?? (toMode === "search" && !contactNameProp ? "" : `Follow-up · ${contactNameProp || "client"}`));
    setFiles([]);
    setError(null);
    setToDraft(toAddressProp);
    setPickedName(contactNameProp);
    setRelated(relatedProp);
    setHits([]);
    setListOpen(false);
    let cancelled = false;
    loadQuickCommsEmailSignature()
      .then((sig) => {
        if (cancelled) return;
        setSignature(sig);
        const greeting =
          initialBody?.trim() ||
          (toMode === "search" && !contactNameProp
            ? ""
            : `Hi ${contactNameProp || "there"},\n\n`);
        const withSig =
          sig && greeting && !greeting.includes(sig)
            ? `${greeting}\n\n${sig}`
            : sig && !greeting
              ? `\n\n${sig}`
              : greeting || (sig ? `\n\n${sig}` : "");
        requestAnimationFrame(() => {
          if (editorRef.current) editorRef.current.innerText = withSig;
        });
      })
      .catch(() => {
        if (cancelled) return;
        requestAnimationFrame(() => {
          if (editorRef.current) {
            editorRef.current.innerText =
              initialBody?.trim() ||
              (toMode === "search" && !contactNameProp
                ? ""
                : `Hi ${contactNameProp || "there"},\n\n`);
          }
        });
      });
    return () => {
      cancelled = true;
    };
    // Reset only when the dialog opens / seed props for this open change.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional open-gated reset
  }, [open, contactNameProp, initialSubject, initialBody, toAddressProp, toMode]);

  // When Open Compose has record context but no To yet (deal CF-only parties),
  // resolve contact → lead → account → Deal Details CF the same way search does.
  useEffect(() => {
    if (!open) return;
    if ((toAddressProp ?? "").trim()) return;
    const related = {
      dealId: relatedProp.dealId,
      leadId: relatedProp.leadId,
      contactId: relatedProp.contactId,
      accountId: relatedProp.accountId,
    };
    const hasRecord = Boolean(related.dealId || related.leadId || related.contactId || related.accountId);
    if (!hasRecord) return;
    let cancelled = false;
    void resolveComposeOpenPrefill(related).then((prefill) => {
      if (cancelled || !prefill.email) return;
      setToDraft(prefill.email);
      if (prefill.name) setPickedName(prefill.name);
    });
    return () => {
      cancelled = true;
    };
    // Depend on ids (not relatedProp object identity) so board re-renders do not re-fetch.
  }, [
    open,
    toAddressProp,
    relatedProp.dealId,
    relatedProp.leadId,
    relatedProp.contactId,
    relatedProp.accountId,
  ]);

  useEffect(() => {
    if (!open || toMode !== "search") return;
    const q = debouncedTo.trim();
    if (!q || looksLikeEmail(q)) {
      setHits([]);
      return;
    }
    let cancelled = false;
    void searchComposeRecipients(q).then((rows) => {
      if (!cancelled) {
        setHits(rows);
        setListOpen(rows.length > 0);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [debouncedTo, open, toMode]);

  function runFormat(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
  }

  function onPaste(event: ClipboardEvent<HTMLDivElement>) {
    const items = event.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (!item.type.startsWith("image/")) continue;
      event.preventDefault();
      const file = item.getAsFile();
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const src = String(reader.result ?? "");
        if (!src || !editorRef.current) return;
        editorRef.current.focus();
        document.execCommand("insertImage", false, src);
      };
      reader.readAsDataURL(file);
      return;
    }
  }

  function onPickFiles(list: FileList | null) {
    if (!list?.length) return;
    setFiles((prev) => [...prev, ...Array.from(list)].slice(0, 5));
  }

  function pickRecipient(hit: ComposeRecipientHit) {
    setToDraft(hit.email?.trim() || "");
    setPickedName(hit.name);
    setRelated({
      contactId: hit.kind === "contact" ? hit.id : hit.contactId ?? null,
      accountId: hit.kind === "account" ? hit.id : hit.accountId ?? null,
      leadId: hit.kind === "lead" ? hit.id : hit.leadId ?? null,
      dealId: hit.kind === "deal" ? hit.id : hit.dealId ?? null,
    });
    setHits([]);
    setListOpen(false);
    setError(hit.email ? null : "No email on that record — type an address to send.");
  }

  function onToChange(value: string) {
    setToDraft(value);
    setRelated({});
    setPickedName("");
    setListOpen(true);
  }

  function send() {
    setError(null);
    const html = editorRef.current?.innerHTML ?? "";
    const plain = htmlToPlain(html);
    if (!toAddress.trim()) {
      setError(toMode === "search" ? "Add a To address or pick a contact, lead, deal, or account." : "No email on this contact.");
      return;
    }
    if (!looksLikeEmail(toAddress)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!subject.trim()) {
      setError("Add a subject.");
      return;
    }
    if (!plain) {
      setError("Write a short message first.");
      return;
    }
    const formData = new FormData();
    formData.set("intent", "now");
    formData.set("toAddress", toAddress);
    formData.set("subject", subject.trim());
    formData.set("body", plain);
    formData.set("bodyHtml", html);
    if (templateId) formData.set("templateId", templateId);
    const ids = toMode === "search" ? related : relatedProp;
    if (ids.dealId) formData.set("dealId", ids.dealId);
    if (ids.leadId) formData.set("leadId", ids.leadId);
    if (ids.contactId) formData.set("contactId", ids.contactId);
    if (ids.accountId) formData.set("accountId", ids.accountId);
    if (ids.policyId) formData.set("policyId", ids.policyId);
    for (const file of files) formData.append("composeFile", file);
    startTransition(async () => {
      try {
        await sendDeskEmail(formData);
        onOpenChange(false);
        onSent?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not send email.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[min(80vh,56rem)] w-[min(92vw,74rem)] flex-col gap-3 overflow-hidden p-4 sm:max-w-[74rem]",
        )}
        data-ff-qc-email-compose=""
      >
        <DialogHeader className="space-y-1 pr-6">
          <DialogTitle className="text-base text-navy">Compose email</DialogTitle>
          <p className="text-xs text-muted-foreground">
            {stayHint ?? "Stays on this page · agency mailbox · signature on by default"}
          </p>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5">
          <div className="relative">
            <Label className="text-xs">To</Label>
            {toMode === "search" ? (
              <>
                <Input
                  value={toDraft}
                  onChange={(event) => onToChange(event.target.value)}
                  onFocus={() => setListOpen(hits.length > 0)}
                  className="mt-1 h-8"
                  placeholder="Search contacts, leads, deals, or accounts — or type an email"
                  autoComplete="off"
                  data-ff-qc-compose-to=""
                  data-ff-compose-to-search=""
                />
                {listOpen && hits.length > 0 ? (
                  <ul
                    className="absolute z-20 mt-1 max-h-36 w-full overflow-y-auto rounded-md border border-border bg-card shadow-md"
                    data-ff-compose-recipient-hits=""
                    role="listbox"
                  >
                    {hits.map((hit) => (
                      <li key={`${hit.kind}-${hit.id}`}>
                        <button
                          type="button"
                          className="flex w-full flex-col items-start gap-0.5 px-2.5 py-1.5 text-left text-sm hover:bg-muted/60"
                          onClick={() => pickRecipient(hit)}
                          data-ff-compose-recipient={hit.kind}
                        >
                          <span className="font-medium text-navy">{hit.name}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {hit.kind === "contact"
                              ? "Contact"
                              : hit.kind === "lead"
                                ? "Lead"
                                : hit.kind === "deal"
                                  ? "Deal"
                                  : "Account"}
                            {hit.email ? ` · ${hit.email}` : " · no email"}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {pickedName && (related.contactId || related.accountId || related.leadId || related.dealId) ? (
                  <p className="mt-1 text-[11px] text-muted-foreground" data-ff-compose-linked="">
                    Linked{" "}
                    {related.contactId
                      ? "contact"
                      : related.leadId
                        ? "lead"
                        : related.dealId
                          ? "deal"
                          : "account"}
                    : {pickedName}
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <Input
                  readOnly
                  value={toAddressProp}
                  className="mt-1 h-8 bg-muted/40"
                  placeholder="No email on contact"
                  data-ff-qc-compose-to=""
                />
                {contactNameProp.trim() ? (
                  <p className="mt-1 text-[11px] text-muted-foreground" data-ff-compose-linked="">
                    {contactNameProp.trim()}
                  </p>
                ) : null}
              </>
            )}
          </div>
          <div>
            <Label className="text-xs">Subject</Label>
            <Input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="mt-1 h-8"
              data-ff-qc-compose-subject=""
            />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-1">
              <Button type="button" size="xs" variant="outline" onClick={() => runFormat("bold")} aria-label="Bold">
                <Bold className="size-3.5" />
              </Button>
              <Button type="button" size="xs" variant="outline" onClick={() => runFormat("italic")} aria-label="Italic">
                <Italic className="size-3.5" />
              </Button>
              {FONT_SIZES.map((size) => (
                <Button
                  key={size.value}
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={() => runFormat("fontSize", size.value)}
                  aria-label={`Font ${size.label}`}
                >
                  <Type className="size-3.5" />
                  <span className="ml-0.5 text-[10px]">{size.label}</span>
                </Button>
              ))}
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Color ${color}`}
                  className="size-5 rounded-full border border-border"
                  style={{ backgroundColor: color }}
                  onClick={() => runFormat("foreColor", color)}
                />
              ))}
              <Button type="button" size="xs" variant="outline" onClick={() => fileRef.current?.click()}>
                <Paperclip className="size-3.5" />
                Attach
              </Button>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt"
                onChange={(event) => onPickFiles(event.target.files)}
              />
            </div>
            <div
              ref={editorRef}
              contentEditable
              role="textbox"
              aria-label="Email body"
              data-ff-qc-compose-body=""
              className="mt-1 min-h-[12rem] max-h-[min(36vh,22rem)] overflow-y-auto rounded-md border border-input bg-card px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onPaste={onPaste}
              suppressContentEditableWarning
            />
            {signature ? (
              <p className="mt-1 text-[11px] text-muted-foreground" data-ff-qc-compose-signature="">
                Signature applied from your email signature settings.
              </p>
            ) : null}
            {files.length ? (
              <ul className="mt-1 space-y-0.5 text-[11px] text-navy" data-ff-qc-compose-files="">
                {files.map((file) => (
                  <li key={`${file.name}-${file.size}`}>· {file.name}</li>
                ))}
              </ul>
            ) : null}
          </div>
          {error ? <p className="text-xs text-red-700">{error}</p> : null}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" size="sm" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" size="sm" disabled={pending} onClick={send} data-ff-qc-compose-send="">
            {pending ? "Sending…" : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
