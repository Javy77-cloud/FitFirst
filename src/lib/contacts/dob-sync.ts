/** Deal ↔ Contact DOB sync. Storage stays ISO `YYYY-MM-DD`. UI is MM/DD/YYYY. */

export const DEAL_DOB_FIELD_KEYS = [
  "date_of_birth",
  "applicant_dob",
  "insured_dob",
  "dob",
] as const;

const ISO = /^(\d{4})-(\d{1,2})-(\d{1,2})/;
const MDY = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/;

export function parseDobToIso(raw: string | null | undefined): string | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const iso = text.match(ISO);
  if (iso) {
    const y = Number(iso[1]);
    const m = Number(iso[2]);
    const d = Number(iso[3]);
    if (!validYmd(y, m, d)) return null;
    return `${pad(y, 4)}-${pad(m)}-${pad(d)}`;
  }
  const mdy = text.match(MDY);
  if (mdy) {
    const m = Number(mdy[1]);
    const d = Number(mdy[2]);
    const y = Number(mdy[3]);
    if (!validYmd(y, m, d)) return null;
    return `${pad(y, 4)}-${pad(m)}-${pad(d)}`;
  }
  return null;
}

/** Site-wide DOB display: MM/DD/YYYY. Never year-first ISO. */
export function formatDobMdy(raw: string | Date | null | undefined): string {
  if (raw == null || raw === "") return "—";
  const iso =
    raw instanceof Date
      ? utcIsoFromDate(raw)
      : parseDobToIso(raw);
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y}`;
}

export function firstParseableDob(
  ...values: Array<string | null | undefined>
): string | null {
  for (const value of values) {
    const iso = parseDobToIso(value);
    if (iso) return iso;
  }
  return null;
}

/** Pull a real DOB from deal/lead/sheet bags. Never invent. */
export function dobFromDealSources(input: {
  dealValues?: Record<string, string | null | undefined> | null;
  leadDob?: string | null;
  sheetValues?: Record<string, { value?: unknown } | string | null | undefined> | null;
}): string | null {
  const deal = input.dealValues ?? {};
  const sheet = input.sheetValues ?? {};
  return firstParseableDob(
    ...DEAL_DOB_FIELD_KEYS.map((key) => deal[key]),
    input.leadDob,
    ...DEAL_DOB_FIELD_KEYS.map((key) => sheetStr(sheet, key)),
  );
}

/** Empty-only: copy incoming DOB onto contact when contact DOB is blank. */
export function emptyOnlyDobPatch(
  contactDob: string | null | undefined,
  incomingDob: string | null | undefined,
): { date_of_birth: string } | null {
  if (parseDobToIso(contactDob)) return null;
  const next = parseDobToIso(incomingDob);
  if (!next) return null;
  return { date_of_birth: next };
}

export function firstFilledDob(
  ...values: Array<string | null | undefined>
): string {
  return firstParseableDob(...values) ?? "";
}

function sheetStr(
  sheet: Record<string, { value?: unknown } | string | null | undefined>,
  key: string,
): string {
  const cell = sheet[key];
  if (cell == null) return "";
  if (typeof cell === "string") return cell;
  return String(cell.value ?? "").trim();
}

function validYmd(y: number, m: number, d: number): boolean {
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return false;
  if (y < 1800 || y > 2200 || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function pad(n: number, width = 2): string {
  return String(n).padStart(width, "0");
}

function utcIsoFromDate(value: Date): string | null {
  if (Number.isNaN(value.getTime())) return null;
  if (
    value.getUTCHours() === 0 &&
    value.getUTCMinutes() === 0 &&
    value.getUTCSeconds() === 0 &&
    value.getUTCMilliseconds() === 0
  ) {
    return `${pad(value.getUTCFullYear(), 4)}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
  }
  return `${pad(value.getFullYear(), 4)}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}
