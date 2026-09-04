"use client";

import { useState } from "react";
import { sendDeskEmail, sendDeskSms } from "@/app/actions/comms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { fileDownloadHref, filePreviewHref, fileViewHref } from "@/lib/files/urls";

export type DocFileActionsProps = {
  documentId: string;
  filename: string;
  dealId?: string | null;
  contactId?: string | null;
  accountId?: string | null;
  email?: string | null;
  phone?: string | null;
  compact?: boolean;
};

export function DocFileActions({
  documentId,
  filename,
  dealId,
  contactId,
  accountId,
  email,
  phone,
  compact = false,
}: DocFileActionsProps) {
  const [compose, setCompose] = useState<"email" | "sms" | null>(null);
  const viewHref = fileViewHref(documentId);
  const downloadHref = fileDownloadHref(documentId);
  const printHref = filePreviewHref(documentId, true);

  return (
    <div className={compact ? "flex flex-wrap items-center gap-1" : "flex flex-wrap items-center gap-2"}>
      <a
        href={viewHref}
        target="_blank"
        rel="noreferrer"
        className="text-xs text-primary hover:underline"
      >
        View
      </a>
      <a href={downloadHref} className="text-xs text-primary hover:underline">
        Download
      </a>
      <button type="button" className="text-xs text-primary hover:underline" onClick={() => setCompose("email")}>
        Email
      </button>
      <button type="button" className="text-xs text-primary hover:underline" onClick={() => setCompose("sms")}>
        SMS
      </button>
      <a href={printHref} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
        Print
      </a>

      <Sheet open={compose !== null} onOpenChange={(open) => !open && setCompose(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{compose === "sms" ? "SMS this file" : "Email this file"}</SheetTitle>
            <SheetDescription>
              Desk stub. Nothing leaves FitFirst. The Timeline logs the send and names {filename}.
            </SheetDescription>
          </SheetHeader>
          {compose === "email" ? (
            <form action={sendDeskEmail} className="space-y-3 px-4 pb-4" onSubmit={() => setCompose(null)}>
              {dealId ? <input type="hidden" name="dealId" value={dealId} /> : null}
              {contactId ? <input type="hidden" name="contactId" value={contactId} /> : null}
              {accountId ? <input type="hidden" name="accountId" value={accountId} /> : null}
              {email ? <input type="hidden" name="toAddress" value={email} /> : null}
              <div>
                <Label className="text-xs">To</Label>
                <Input name="email" defaultValue={email ?? ""} className="mt-1 h-8" placeholder="client@email" />
              </div>
              <div>
                <Label className="text-xs">Subject</Label>
                <Input name="subject" defaultValue={`${filename} from the desk`} className="mt-1 h-8" />
              </div>
              <div>
                <Label className="text-xs">Message</Label>
                <Textarea
                  name="body"
                  className="mt-1 min-h-24"
                  defaultValue={`Attached for review: ${filename}\nOpen on the deal: ${viewHref}`}
                />
              </div>
              <Button type="submit" size="sm">
                Send email stub
              </Button>
            </form>
          ) : null}
          {compose === "sms" ? (
            <form action={sendDeskSms} className="space-y-3 px-4 pb-4" onSubmit={() => setCompose(null)}>
              {dealId ? <input type="hidden" name="dealId" value={dealId} /> : null}
              {contactId ? <input type="hidden" name="contactId" value={contactId} /> : null}
              {accountId ? <input type="hidden" name="accountId" value={accountId} /> : null}
              <input type="hidden" name="direction" value="outbound" />
              <div>
                <Label className="text-xs">Phone</Label>
                <Input name="phone" defaultValue={phone ?? ""} className="mt-1 h-8" placeholder="(321) 555-0100" />
              </div>
              <div>
                <Label className="text-xs">Message</Label>
                <Input
                  name="body"
                  className="mt-1 h-8"
                  defaultValue={`Sending ${filename} from the desk (stub).`}
                />
              </div>
              <Button type="submit" size="sm">
                Send SMS stub
              </Button>
            </form>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
