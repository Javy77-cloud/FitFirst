import type { AppetiteNoteRow, DontWriteNoteRow } from "@/lib/db/schema";

export type { AppetiteNoteRow, DontWriteNoteRow };

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyAppetiteRow(partial?: Partial<AppetiteNoteRow>): AppetiteNoteRow {
  return {
    id: partial?.id || newId(),
    dateRequested: partial?.dateRequested ?? "",
    lob: partial?.lob ?? "",
    roofAge: partial?.roofAge ?? "",
    waterHeater: partial?.waterHeater ?? "",
    hvac: partial?.hvac ?? "",
    electrical: partial?.electrical ?? "",
    claimsHistory: partial?.claimsHistory ?? "",
    acceptDecline: partial?.acceptDecline ?? "",
    notes: partial?.notes ?? "",
  };
}

export function emptyDontWriteRow(partial?: Partial<DontWriteNoteRow>): DontWriteNoteRow {
  return {
    id: partial?.id || newId(),
    date: partial?.date ?? "",
    lob: partial?.lob ?? "",
    reason: partial?.reason ?? "",
    notes: partial?.notes ?? "",
  };
}

function asRecord(row: unknown): Record<string, unknown> {
  return row && typeof row === "object" ? (row as Record<string, unknown>) : {};
}

export function normalizeAppetiteRows(raw: unknown): AppetiteNoteRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      const r = asRecord(row);
      const acceptRaw = String(r.acceptDecline ?? r.accept_decline ?? "")
        .trim()
        .toLowerCase();
      const acceptDecline: AppetiteNoteRow["acceptDecline"] =
        acceptRaw === "accept" || acceptRaw === "decline" ? acceptRaw : "";
      return emptyAppetiteRow({
        id: String(r.id ?? "") || newId(),
        dateRequested: String(r.dateRequested ?? r.date_requested ?? "").trim(),
        lob: String(r.lob ?? "").trim(),
        roofAge: String(r.roofAge ?? r.roof_age ?? "").trim(),
        waterHeater: String(r.waterHeater ?? r.water_heater ?? "").trim(),
        hvac: String(r.hvac ?? "").trim(),
        electrical: String(r.electrical ?? "").trim(),
        claimsHistory: String(r.claimsHistory ?? r.claims_history ?? "").trim(),
        acceptDecline,
        notes: String(r.notes ?? "").trim(),
      });
    })
    .filter(
      (row) =>
        row.dateRequested ||
        row.lob ||
        row.roofAge ||
        row.waterHeater ||
        row.hvac ||
        row.electrical ||
        row.claimsHistory ||
        row.acceptDecline ||
        row.notes,
    );
}

export function normalizeDontWriteRows(raw: unknown): DontWriteNoteRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      const r = asRecord(row);
      return emptyDontWriteRow({
        id: String(r.id ?? "") || newId(),
        date: String(r.date ?? "").trim(),
        lob: String(r.lob ?? "").trim(),
        reason: String(r.reason ?? "").trim(),
        notes: String(r.notes ?? "").trim(),
      });
    })
    .filter((row) => row.date || row.lob || row.reason || row.notes);
}

/** Flatten structured rows (+ legacy plain text) for list search. */
export function appetiteSearchBlob(input: {
  appetiteNotes?: string | null;
  dontWriteNotes?: string | null;
  appetiteRows?: AppetiteNoteRow[] | null;
  dontWriteRows?: DontWriteNoteRow[] | null;
}): { writes: string; excludes: string } {
  const appetiteParts = [
    input.appetiteNotes ?? "",
    ...(input.appetiteRows ?? []).flatMap((row) => [
      row.dateRequested,
      row.lob,
      row.roofAge,
      row.waterHeater,
      row.hvac,
      row.electrical,
      row.claimsHistory,
      row.acceptDecline,
      row.notes,
    ]),
  ];
  const dontParts = [
    input.dontWriteNotes ?? "",
    ...(input.dontWriteRows ?? []).flatMap((row) => [
      row.date,
      row.lob,
      row.reason,
      row.notes,
    ]),
  ];
  return {
    writes: appetiteParts.filter(Boolean).join(" "),
    excludes: dontParts.filter(Boolean).join(" "),
  };
}

export function parseAppetiteRowsJson(raw: string): AppetiteNoteRow[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    return normalizeAppetiteRows(JSON.parse(trimmed));
  } catch {
    return [];
  }
}

export function parseDontWriteRowsJson(raw: string): DontWriteNoteRow[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    return normalizeDontWriteRows(JSON.parse(trimmed));
  } catch {
    return [];
  }
}
