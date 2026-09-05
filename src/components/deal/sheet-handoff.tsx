"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FILL_MESSAGE_SOURCE, FILL_MESSAGE_TYPE, FILL_STORAGE_KEY } from "@/lib/wire/sheet-packet";

export function SheetHandoffButtons({
  dealId,
  line,
  unlocked = true,
}: {
  dealId: string;
  line: string;
  unlocked?: boolean;
}) {
  const [note, setNote] = useState<string | null>(null);

  async function sendToFill() {
    if (!unlocked) {
      setNote("Approve the master sheet first. Send to Fill stays locked.");
      return;
    }
    const res = await fetch(`/api/deals/${dealId}/quote-sheets/${line}/fill`);
    if (!res.ok) {
      setNote("Quote Sheet record is missing.");
      return;
    }
    const sheet = await res.json();
    window.localStorage.setItem(FILL_STORAGE_KEY, JSON.stringify(sheet));
    window.postMessage({ source: FILL_MESSAGE_SOURCE, type: FILL_MESSAGE_TYPE, sheet }, "*");
    await navigator.clipboard.writeText(JSON.stringify(sheet, null, 2)).catch(() => undefined);
    setNote("Sent the Quote Sheet record to Fill (clipboard + localStorage). Not a raw PDF.");
  }

  async function copySheet() {
    if (!unlocked) {
      setNote("Approve the master sheet first. Copy sheet stays locked.");
      return;
    }
    const res = await fetch(`/api/deals/${dealId}/quote-sheets/${line}/super-copy`);
    if (!res.ok) {
      setNote("Quote Sheet record is missing.");
      return;
    }
    const packet = await res.json();
    await navigator.clipboard.writeText(JSON.stringify(packet, null, 2)).catch(() => undefined);
    setNote("Copied Super-Copy from the same Quote Sheet record.");
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" variant="secondary" onClick={copySheet} disabled={!unlocked}>
        Copy sheet
      </Button>
      <Button type="button" size="sm" variant="secondary" onClick={sendToFill} disabled={!unlocked}>
        Send to Fill
      </Button>
      <a href="/fill-demo" className="text-xs text-primary hover:underline">
        Open Fill demo
      </a>
      {note ? <span className="text-base text-muted-foreground">{note}</span> : null}
    </div>
  );
}
