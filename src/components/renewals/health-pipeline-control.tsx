"use client";

import { useState } from "react";
import { setHealthPipelineStatus } from "@/app/actions/health-pipeline";
import { SpeechNoteDialog } from "@/components/deal/speech-note-dialog";
import { Button } from "@/components/ui/button";
import {
  HEALTH_PIPELINE_STATUSES,
  HEALTH_PIPELINE_STATUS_LABELS,
  healthPipelineStatusLabel,
  isHealthPipelineStatus,
  type HealthPipelineNote,
} from "@/lib/renewal/health-pipeline";

export function HealthPipelineControl({
  policyId,
  status,
  notes,
  returnTo,
}: {
  policyId: string;
  status?: string | null;
  notes?: ReadonlyArray<HealthPipelineNote | { id: string; status: string; body: string; lang: "en" | "es"; channel: "text" | "voice"; actorId: string | null; at: string }> | null;
  returnTo: string;
}) {
  const [body, setBody] = useState("");
  const [channel, setChannel] = useState<"text" | "voice">("text");
  const [lang, setLang] = useState<"en" | "es">("en");
  const [voiceOpen, setVoiceOpen] = useState(false);
  const current = status && HEALTH_PIPELINE_STATUSES.includes(status as (typeof HEALTH_PIPELINE_STATUSES)[number])
    ? status
    : "identified";

  return (
    <section className="ff-card space-y-3 p-4" data-ff-health-pipeline="">
      <div>
        <h2 className="text-base font-semibold text-navy">Health pipeline</h2>
        <p className="text-sm text-muted-foreground">
          Manual status. Quotes stay in HealthSherpa, Connector, or the carrier portal.{" "}
          {healthPipelineStatusLabel(status)}
        </p>
      </div>
      <form action={setHealthPipelineStatus} className="space-y-2">
        <input type="hidden" name="policyId" value={policyId} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <input type="hidden" name="channel" value={channel} />
        <label className="block text-xs font-medium text-navy">
          Status
          <select
            name="status"
            defaultValue={current}
            className="mt-1 h-8 w-full rounded-md border bg-background px-2 text-sm"
            data-ff-health-pipeline-status=""
          >
            {HEALTH_PIPELINE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {HEALTH_PIPELINE_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-navy">
          Note
          <textarea
            name="body"
            value={body}
            onChange={(event) => {
              setBody(event.target.value);
              setChannel("text");
            }}
            rows={2}
            className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
            placeholder="What changed"
            data-ff-health-pipeline-note=""
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-navy">
            Language
            <select
              name="lang"
              value={lang}
              onChange={(event) => setLang(event.target.value === "es" ? "es" : "en")}
              className="ml-1 h-8 rounded-md border bg-background px-2 text-sm"
              data-ff-health-pipeline-lang=""
            >
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </label>
          <Button
            type="button"
            size="xs"
            variant="outline"
            data-ff-health-pipeline-voice=""
            onClick={() => setVoiceOpen(true)}
          >
            Voice note
          </Button>
          <Button type="submit" size="xs" data-ff-health-pipeline-save="">
            Save status
          </Button>
        </div>
      </form>
      <SpeechNoteDialog
        open={voiceOpen}
        onOpenChange={setVoiceOpen}
        title="Health pipeline note"
        description="English or Spanish. The note is saved with the status."
        initialValue={body}
        onSave={(text) => {
          setBody(text);
          setChannel("voice");
          setVoiceOpen(false);
        }}
      />
      {notes && notes.length > 0 ? (
        <ul className="space-y-1 text-xs text-muted-foreground" data-ff-health-pipeline-notes="">
          {notes.slice(-4).map((note) => (
            <li key={note.id}>
              {(isHealthPipelineStatus(note.status) ? HEALTH_PIPELINE_STATUS_LABELS[note.status] : note.status)} · {note.lang} · {note.channel}: {note.body}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
