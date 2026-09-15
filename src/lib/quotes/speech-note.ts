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

type SpeechCtor = new () => {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript?: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
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
