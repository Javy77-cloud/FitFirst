"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { addQuoteNoteAction } from "@/app/actions/quotes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { QuoteNote } from "@/lib/db/schema";
import {
  SPEECH_NOTE_LANGS,
  SPEECH_NOTE_LANG_LABELS,
  appendSpeechTranscript,
  collectFinalSpeechTranscript,
  prepareSpeechMicrophone,
  speechRecognitionCtor,
  type SpeechNoteLang,
} from "@/lib/quotes/speech-note";
import { cn } from "@/lib/utils";
import { Mic, NotebookPen } from "lucide-react";

function formatNoteWhen(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function QuoteNotePad({
  dealId,
  quoteId,
  carrierName,
  notes = [],
  disabled,
}: {
  dealId: string;
  quoteId: string;
  carrierName: string;
  notes?: QuoteNote[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [listening, setListening] = useState<SpeechNoteLang | null>(null);
  const [speechHint, setSpeechHint] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const recRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    return () => {
      recRef.current?.stop();
      recRef.current = null;
    };
  }, []);

  function stopSpeech() {
    recRef.current?.stop();
    recRef.current = null;
    setListening(null);
  }

  async function startSpeech(lang: SpeechNoteLang) {
    const Ctor = speechRecognitionCtor();
    if (!Ctor) {
      setSpeechHint("Voice typing isn’t available in this browser.");
      return;
    }
    stopSpeech();
    try {
      await prepareSpeechMicrophone();
    } catch {
      setSpeechHint("Allow the microphone for this site, then try again.");
      return;
    }
    const rec = new Ctor();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = true;
    if (rec.maxAlternatives != null) rec.maxAlternatives = 1;
    rec.onresult = (event) => {
      const chunk = collectFinalSpeechTranscript(event.results, event.resultIndex ?? 0);
      if (!chunk) return;
      setBody((current) => appendSpeechTranscript(current, chunk));
    };
    rec.onerror = (event) => {
      const err = event?.error ?? "";
      setSpeechHint(
        err === "not-allowed" || err === "service-not-allowed"
          ? "Allow the microphone for this site, then try again."
          : "Mic didn’t catch that — type the note instead.",
      );
      setListening(null);
      recRef.current = null;
    };
    rec.onend = () => {
      setListening(null);
      recRef.current = null;
    };
    recRef.current = rec;
    setSpeechHint(null);
    setListening(lang);
    try {
      rec.start();
    } catch {
      setSpeechHint("Mic didn’t start — type the note instead.");
      setListening(null);
      recRef.current = null;
    }
  }

  function onSave() {
    const text = body.trim();
    if (!text) return;
    const data = new FormData();
    data.set("dealId", dealId);
    data.set("quoteId", quoteId);
    data.set("body", text);
    startTransition(async () => {
      await addQuoteNoteAction(data);
      setBody("");
      setOpen(false);
    });
  }

  return (
    <>
      <button
        type="button"
        aria-label={`Notes for ${carrierName}`}
        data-ff-quote-notepad={quoteId}
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex size-6 shrink-0 items-center justify-center rounded-md border transition-all duration-150",
          notes.length
            ? "border-primary/40 bg-primary/10 text-navy shadow-sm hover:bg-primary/15"
            : "border-transparent text-muted-foreground/50 hover:border-border hover:bg-muted hover:text-navy",
        )}
        title={notes.length ? `${notes.length} note${notes.length === 1 ? "" : "s"}` : "Add a quote note"}
      >
        <NotebookPen className="size-3.5" strokeWidth={notes.length ? 2.4 : 2} />
      </button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) stopSpeech();
          setOpen(next);
        }}
      >
        <DialogContent className="sm:max-w-md" data-ff-quote-notepad-dialog={quoteId}>
          <DialogHeader>
            <DialogTitle className="text-navy">Quote notes</DialogTitle>
            <DialogDescription>
              {carrierName} — typed notes stay on this quote.
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-40 space-y-1.5 overflow-auto" data-ff-quote-notes={quoteId}>
            {notes.length === 0 ? (
              <li className="text-sm text-muted-foreground">No notes yet.</li>
            ) : (
              notes.map((note) => (
                <li
                  key={note.id}
                  className="rounded-lg border border-border/70 bg-muted/20 px-2.5 py-1.5"
                  data-ff-quote-note={note.id}
                >
                  <div className="text-[10px] text-muted-foreground">
                    {formatNoteWhen(note.createdAt)}
                    {note.createdBy ? ` · ${note.createdBy}` : ""}
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm text-navy">{note.body}</p>
                </li>
              ))
            )}
          </ul>
          <label className="block">
            <span className="sr-only">Add note</span>
            <textarea
              name="body"
              value={body}
              maxLength={4000}
              rows={3}
              placeholder="e.g. needs 4-point + wind mit before bind"
              onChange={(event) => setBody(event.target.value)}
              className="w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm"
              data-ff-quote-note-input={quoteId}
            />
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            {SPEECH_NOTE_LANGS.map((lang) => (
              <Button
                key={lang}
                type="button"
                size="xs"
                variant={listening === lang ? "default" : "outline"}
                data-ff-quote-note-speech={quoteId}
                data-ff-quote-note-speech-lang={lang}
                onClick={() => (listening === lang ? stopSpeech() : startSpeech(lang))}
                title={`Dictate in ${SPEECH_NOTE_LANG_LABELS[lang]}`}
              >
                <Mic className="size-3.5" />
                {listening === lang ? "Listening…" : SPEECH_NOTE_LANG_LABELS[lang]}
              </Button>
            ))}
            {/* TODO: paid STT later — Web Speech fills this same field for now. */}
          </div>
          {speechHint ? (
            <p className="text-[11px] text-fit-flag" data-ff-quote-note-speech-fallback="">
              {speechHint}
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Mic uses the browser (en-US / es-US). Type if speech isn’t available.
            </p>
          )}
          <DialogFooter>
            <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!body.trim() || pending}
              onClick={onSave}
              data-ff-quote-note-save={quoteId}
            >
              {pending ? "Saving…" : "Save note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
