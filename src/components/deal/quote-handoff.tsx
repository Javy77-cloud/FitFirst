"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  COPY_SHEET_LABEL,
  FILL_HANDOFF_HINT,
  FILL_HANDOFF_TITLE,
  OPEN_FILL_LABEL,
  SEND_TO_FILL_LABEL,
} from "@/lib/quoting/fill-path";
import { FILL_MESSAGE_SOURCE, FILL_MESSAGE_TYPE, FILL_STORAGE_KEY } from "@/lib/wire/sheet-packet";

export function QuoteHandoff({
  dealId,
  line,
  formLabel,
  unlocked,
}: {
  dealId: string;
  line: string;
  formLabel: string;
  unlocked: boolean;
}) {
  const [note, setNote] = useState<string | null>(null);

  if (!unlocked) {
    return (
      <div className="rounded-md border border-dashed border-border px-3 py-2 text-helper text-muted-foreground">
        Send to Fill stays locked until you approve the {formLabel} master sheet. No per-agent
        bot. Copy master sheet / Send to Fill unlock after the two-step confirm.
      </div>
    );
  }

  async function loadPacket(kind: "fill" | "copy") {
    const path =
      kind === "fill"
        ? `/api/deals/${dealId}/quote-sheets/${line}/fill`
        : `/api/deals/${dealId}/quote-sheets/${line}/super-copy`;
    const res = await fetch(path);
    if (!res.ok) throw new Error("Quote Sheet record is missing.");
    return res.json();
  }

  async function copySheet() {
    try {
      const packet = await loadPacket("copy");
      await navigator.clipboard.writeText(JSON.stringify(packet, null, 2)).catch(() => undefined);
      setNote("Copied the approved master sheet. Paste into the carrier portal — zero rekey.");
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Copy failed.");
    }
  }

  async function sendToFill() {
    try {
      const sheet = await loadPacket("fill");
      window.localStorage.setItem(FILL_STORAGE_KEY, JSON.stringify(sheet));
      window.postMessage({ source: FILL_MESSAGE_SOURCE, type: FILL_MESSAGE_TYPE, sheet }, "*");
      await navigator.clipboard.writeText(JSON.stringify(sheet, null, 2)).catch(() => undefined);
      setNote("Sent the approved master sheet to Fill (clipboard + localStorage). Not a raw PDF.");
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Send to Fill failed.");
    }
  }

  async function openFillWindow() {
    try {
      const sheet = await loadPacket("fill");
      window.localStorage.setItem(FILL_STORAGE_KEY, JSON.stringify(sheet));
      window.postMessage({ source: FILL_MESSAGE_SOURCE, type: FILL_MESSAGE_TYPE, sheet }, "*");
      window.open("/fill-demo", "fitfirst-fill", "noopener,noreferrer,width=1100,height=800");
      setNote(
        "Opened Fill. Chrome Fill reads this same approved master sheet if the add-on is installed.",
      );
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Could not open Fill window.");
    }
  }

  return (
    <div className="rounded-md border border-border bg-card p-3">
      <p className="text-sm font-semibold text-navy">5 · {FILL_HANDOFF_TITLE}</p>
      <p className="mt-1 text-helper text-muted-foreground">{FILL_HANDOFF_HINT}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={copySheet}>
          {COPY_SHEET_LABEL}
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={sendToFill}>
          {SEND_TO_FILL_LABEL}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={openFillWindow}>
          {OPEN_FILL_LABEL}
        </Button>
        <a href="/fill-demo" target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
          Fill demo
        </a>
      </div>
      {note ? <p className="mt-2 text-helper text-muted-foreground">{note}</p> : null}
    </div>
  );
}
