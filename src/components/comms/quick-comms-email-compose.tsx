"use client";

import { useEffect, useRef, useState, useTransition, type ClipboardEvent } from "react";
import { Bold, Italic, Paperclip, Type } from "lucide-react";
import { sendDeskEmail } from "@/app/actions/comms";
import { loadQuickCommsEmailSignature } from "@/app/actions/quick-comms-email";
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

export function QuickCommsEmailCompose({
  open,
  onOpenChange,
  toAddress,
  contactName,
  related,
  initialSubject,
  initialBody,
  templateId = null,
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [subject, setSubject] = useState(initialSubject ?? "");
  const [signature, setSignature] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setSubject(initialSubject ?? `Follow-up · ${contactName || "client"}`);
    setFiles([]);
    setError(null);
    let cancelled = false;
    loadQuickCommsEmailSignature()
      .then((sig) => {
        if (cancelled) return;
        setSignature(sig);
        const greeting = initialBody?.trim() || `Hi ${contactName || "there"},\n\n`;
        const withSig = sig && !greeting.includes(sig) ? `${greeting}\n\n${sig}` : greeting;
        requestAnimationFrame(() => {
          if (editorRef.current) editorRef.current.innerText = withSig;
        });
      })
      .catch(() => {
        if (cancelled) return;
        requestAnimationFrame(() => {
          if (editorRef.current) {
            editorRef.current.innerText =
              initialBody?.trim() || `Hi ${contactName || "there"},\n\n`;
          }
        });
      });
    return () => {
      cancelled = true;
    };
  }, [open, contactName, initialSubject, initialBody]);

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

  function send() {
    setError(null);
    const html = editorRef.current?.innerHTML ?? "";
    const plain = htmlToPlain(html);
    if (!toAddress.trim()) {
      setError("No email on this contact.");
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
    if (related.dealId) formData.set("dealId", related.dealId);
    if (related.leadId) formData.set("leadId", related.leadId);
    if (related.contactId) formData.set("contactId", related.contactId);
    if (related.accountId) formData.set("accountId", related.accountId);
    if (related.policyId) formData.set("policyId", related.policyId);
    for (const file of files) formData.append("composeFile", file);
    startTransition(async () => {
      try {
        await sendDeskEmail(formData);
        onOpenChange(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not send email.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[50vh] w-[min(100%,28rem)] flex-col gap-3 overflow-hidden p-4 sm:max-w-md",
        )}
        data-ff-qc-email-compose=""
      >
        <DialogHeader className="space-y-1 pr-6">
          <DialogTitle className="text-base text-navy">Compose email</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Stays on this page · agency mailbox · signature on by default
          </p>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5">
          <div>
            <Label className="text-xs">To</Label>
            <Input
              readOnly
              value={toAddress}
              className="mt-1 h-8 bg-muted/40"
              placeholder="No email on contact"
              data-ff-qc-compose-to=""
            />
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
              className="mt-1 min-h-[7rem] max-h-[14vh] overflow-y-auto rounded-md border border-input bg-card px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
