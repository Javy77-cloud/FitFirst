export const SPEECH_NOTE_LANGS = ["en-US", "es-US"] as const;
export type SpeechNoteLang = (typeof SPEECH_NOTE_LANGS)[number];

export const SPEECH_NOTE_LANG_LABELS: Record<SpeechNoteLang, string> = {
  "en-US": "English",
  "es-US": "Español",
};

export function appendSpeechTranscript(current: string, chunk: string): string {
  const next = chunk.trim();
  if (!next) return current;
  if (!current.trim()) return next;
  return `${current.replace(/\s+$/, "")} ${next}`;
}

export type SpeechResultLike = {
  isFinal?: boolean;
  0?: { transcript?: string };
};

export function collectFinalSpeechTranscript(
  results: ArrayLike<SpeechResultLike> | null | undefined,
  resultIndex = 0,
): string {
  if (!results) return "";
  const parts: string[] = [];
  const start = Math.max(0, resultIndex);
  for (let i = start; i < results.length; i++) {
    const row = results[i];
    if (!row) continue;
    if (row.isFinal === false) continue;
    const text = String(row[0]?.transcript ?? "").trim();
    if (text) parts.push(text);
  }
  return parts.join(" ");
}

type SpeechCtor = new () => {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives?: number;
  onresult:
    | ((event: {
        resultIndex?: number;
        results: ArrayLike<SpeechResultLike>;
      }) => void)
    | null;
  onend: (() => void) | null;
  onerror: ((event?: { error?: string }) => void) | null;
  start: () => void;
  stop: () => void;
};

export function speechRecognitionCtor(): SpeechCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechCtor;
    webkitSpeechRecognition?: SpeechCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function speechRecognitionSupported(): boolean {
  return speechRecognitionCtor() != null;
}

/** Unlock the mic before SpeechRecognition.start — Chrome otherwise “listens” with no transcript. */
export async function prepareSpeechMicrophone(): Promise<void> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return;
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  for (const track of stream.getTracks()) track.stop();
}
