"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { NoticeNoteLogEntry } from "@/lib/deals/product-stages";
import { cn } from "@/lib/utils";
import { NotebookPen } from "lucide-react";

function formatNoteWhen(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Marker + red count — opens the notice-note log only (no writer). */
export function NoticeNotePad({
  noticeLabel,
  note = "",
  notes = [],
}: {
  dealId?: string;
  product?: string;
  noticeLabel: string;
  note?: string | null;
  notes?: readonly NoticeNoteLogEntry[];
  returnTo?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const log =
    notes.length > 0
      ? notes
      : (note ?? "").trim()
        ? [{ body: note!.trim(), at: "", agent: null }]
        : [];
  const count = log.length;

  return (
    <>
      <button
        type="button"
        aria-label={`Notice note log for ${noticeLabel}${count ? ` (${count})` : ""}`}
        data-ff-notice-notepad=""
        data-ff-notice-note-log=""
        onClick={() => setOpen(true)}
        className={cn(
          "relative inline-flex size-6 shrink-0 items-center justify-center rounded-md border transition-all duration-150",
          count
            ? "border-primary/40 bg-primary/10 text-navy shadow-sm hover:bg-primary/15"
            : "border-transparent text-muted-foreground/50 hover:border-border hover:bg-muted hover:text-navy",
        )}
        title={count ? `${count} notice note${count === 1 ? "" : "s"}` : "Notice note log"}
      >
        <NotebookPen className="size-3.5" strokeWidth={count ? 2.4 : 2} />
        {count > 0 ? (
          <span
            data-ff-notice-note-count={count}
            className="absolute -bottom-1 -right-1 inline-flex min-w-3.5 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold leading-4 text-white"
          >
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" data-ff-notice-notepad-dialog="" data-ff-notice-note-log-dialog="">
          <DialogHeader>
            <DialogTitle className="text-navy">Notice note log</DialogTitle>
            <DialogDescription>
              {noticeLabel} — read history only. Write the completion note in Complete notes.
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-52 space-y-1.5 overflow-auto" data-ff-notice-note-log-list="">
            {log.length === 0 ? (
              <li className="text-sm text-muted-foreground">No notes yet.</li>
            ) : (
              log.map((entry, index) => (
                <li
                  key={`${entry.at}-${index}`}
                  className="rounded-lg border border-border/70 bg-muted/20 px-2.5 py-1.5"
                  data-ff-notice-note-log-item=""
                >
                  {entry.at || entry.agent ? (
                    <div className="text-[10px] text-muted-foreground">
                      {[formatNoteWhen(entry.at), entry.agent].filter(Boolean).join(" · ")}
                    </div>
                  ) : null}
                  <p className="whitespace-pre-wrap text-sm text-navy">{entry.body}</p>
                </li>
              ))
            )}
          </ul>
          <DialogFooter>
            <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
