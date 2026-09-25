"use client";

import { ProcessingLabel } from "@/components/desk/wait-hold";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  SPEECH_NOTE_LANGS,
  SPEECH_NOTE_LANG_LABELS,
  appendSpeechTranscript,
  collectFinalSpeechTranscript,
  prepareSpeechMicrophone,
  speechRecognitionCtor,
  type SpeechNoteLang,
} from "@/lib/quotes/speech-note";
import { Mic } from "lucide-react";

/** Speak/type sheet used by bindable carrier notes and notice complete-notes. */
export function SpeechNoteDialog({
  open,
  onOpenChange,
  title,
  description,
  initialValue = "",
  placeholder = "e.g. Four-Point cleared, waiting on wind mit",
  saveLabel = "Save note",
  pendingLabel = "Saving…",
  testId = "ff-speech-note",
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  initialValue?: string;
  placeholder?: string;
  saveLabel?: string;
  pendingLabel?: string;
  testId?: string;
  onSave: (text: string) => Promise<void> | void;
}) {
  const [body, setBody] = useState(initialValue);
  const [listening, setListening] = useState<SpeechNoteLang | null>(null);
  const [speechHint, setSpeechHint] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const recRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    if (open) setBody(initialValue);
  }, [open, initialValue]);

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

  function save() {
    const text = body.trim();
    startTransition(async () => {
      await onSave(text);
      onOpenChange(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) stopSpeech();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md" data-ff-speech-note-dialog={testId}>
        <DialogHeader>
          <DialogTitle className="text-navy">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <label className="block">
          <span className="sr-only">{title}</span>
          <textarea
            name="body"
            value={body}
            maxLength={4000}
            rows={3}
            placeholder={placeholder}
            onChange={(event) => setBody(event.target.value)}
            className="w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm"
            data-ff-notice-note-input=""
            data-ff-speech-note-input=""
          />
        </label>
        <div className="flex flex-wrap items-center gap-1.5">
          {SPEECH_NOTE_LANGS.map((lang) => (
            <Button
              key={lang}
              type="button"
              size="xs"
              variant={listening === lang ? "default" : "outline"}
              data-ff-notice-note-speech=""
              data-ff-notice-note-speech-lang={lang}
              onClick={() => (listening === lang ? stopSpeech() : startSpeech(lang))}
              title={`Dictate in ${SPEECH_NOTE_LANG_LABELS[lang]}`}
            >
              <Mic className="size-3.5" />
              {listening === lang ? "Listening…" : SPEECH_NOTE_LANG_LABELS[lang]}
            </Button>
          ))}
        </div>
        {speechHint ? (
          <p className="text-[11px] text-fit-flag" data-ff-notice-note-speech-fallback="">
            {speechHint}
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            Mic uses the browser (en-US / es-US). Type if speech isn’t available.
          </p>
        )}
        <DialogFooter>
          <Button type="button" size="sm" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={save}
            data-ff-notice-note-save=""
          >
            {pending ? <ProcessingLabel>{pendingLabel}</ProcessingLabel> : saveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
