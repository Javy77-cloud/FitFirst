"use client";

import { useState, useTransition } from "react";
import { copySignedEnvelopeLink, resendSignedEnvelope } from "@/app/actions/esign-retrieval";
import { Button, buttonVariants } from "@/components/ui/button";
import { signedDownloadHref, type SignedRetrievalRow } from "@/lib/esign/retrieval";
import { cn } from "@/lib/utils";

export function SignedRetrievalActions({ row }: { row: SignedRetrievalRow }) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-1">
        {row.canDownload ? (
          <a href={signedDownloadHref(row.id)} className={cn(buttonVariants({ size: "xs", variant: "outline" }))}>
            Download
          </a>
        ) : null}
        {row.canResend ? (
          <Button
            type="button"
            size="xs"
            variant="outline"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const form = new FormData();
                form.set("id", row.id);
                const result = await resendSignedEnvelope(form);
                setNote(result.message);
              });
            }}
          >
            Resend
          </Button>
        ) : null}
        {row.canCopyLink ? (
          <Button
            type="button"
            size="xs"
            variant="outline"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const form = new FormData();
                form.set("id", row.id);
                const result = await copySignedEnvelopeLink(form);
                if (result.ok && result.url) {
                  try {
                    await navigator.clipboard.writeText(result.url);
                    setNote("Link copied.");
                    return;
                  } catch {
                    setNote(result.url);
                    return;
                  }
                }
                setNote(result.message);
              });
            }}
          >
            Copy link
          </Button>
        ) : null}
      </div>
      {note ? <p className="max-w-[220px] text-right text-[10px] text-muted-foreground">{note}</p> : null}
    </div>
  );
}
