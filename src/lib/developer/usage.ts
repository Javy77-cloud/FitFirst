/** Developer hub API meters. Counts increment only on real vendor HTTP. Never fake. */

export const DEVELOPER_API_PROVIDERS = [
  "mapbox",
  "gemini",
  "fedex",
  "getparceldata",
  "florida_property",
  "healthsherpa_medicare",
  "healthsherpa_aca",
] as const;

export type DeveloperApiProvider = (typeof DEVELOPER_API_PROVIDERS)[number];

export type DeveloperApiMeterId = DeveloperApiProvider | "permitstack" | "vin_decode";

export type DeveloperApiMeter = {
  id: DeveloperApiMeterId;
  label: string;
  instrumented: boolean;
};

export const DEVELOPER_API_METERS: readonly DeveloperApiMeter[] = [
  { id: "mapbox", label: "Mapbox suggest", instrumented: true },
  { id: "gemini", label: "Gemini", instrumented: true },
  { id: "fedex", label: "FedEx verify", instrumented: true },
  { id: "getparceldata", label: "GetParcelData", instrumented: true },
  { id: "florida_property", label: "FL property", instrumented: true },
  { id: "healthsherpa_medicare", label: "HealthSherpa Medicare", instrumented: true },
  { id: "healthsherpa_aca", label: "HealthSherpa Marketplace", instrumented: true },
  { id: "permitstack", label: "PermitStack", instrumented: false },
  { id: "vin_decode", label: "VIN decode (NHTSA)", instrumented: false },
];

export const NOT_COUNTED_YET = "not counted yet";

export function isDeveloperApiProvider(value: string): value is DeveloperApiProvider {
  return (DEVELOPER_API_PROVIDERS as readonly string[]).includes(value);
}

export function currentUsageMonth(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function envMonthlyLimit(
  provider: string,
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): number | null {
  const key = `FF_API_LIMIT_${provider.toUpperCase()}`;
  const raw = env[key];
  if (raw == null || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export type UsageTile = {
  id: DeveloperApiMeterId;
  label: string;
  instrumented: boolean;
  month: string;
  count: number | null;
  limit: number | null;
  statusLabel: string;
};

export function buildUsageTiles(input: {
  month: string;
  counts: Partial<Record<string, number>>;
  limits?: Partial<Record<string, number | null>>;
}): UsageTile[] {
  return DEVELOPER_API_METERS.map((meter) => {
    const limit = input.limits?.[meter.id] ?? null;
    if (!meter.instrumented) {
      return {
        ...meter,
        month: input.month,
        count: null,
        limit,
        statusLabel: NOT_COUNTED_YET,
      };
    }
    const count = input.counts[meter.id] ?? 0;
    return {
      ...meter,
      month: input.month,
      count,
      limit,
      statusLabel: limit != null ? `${count} / ${limit} this month` : `${count} this month`,
    };
  });
}

type UsageSink = (provider: DeveloperApiProvider) => void;
let usageSink: UsageSink | null = null;

/** Test hook. Product code should not set this. */
export function setDeveloperApiUsageSink(next: UsageSink | null): void {
  usageSink = next;
}

/** Fire-and-forget. Never throws into the product call. */
export function noteDeveloperApiCall(provider: DeveloperApiProvider): void {
  try {
    usageSink?.(provider);
  } catch {
    /* sink must not break the vendor call */
  }
  void persistDeveloperApiCall(provider);
}

async function persistDeveloperApiCall(provider: DeveloperApiProvider): Promise<void> {
  try {
    const { incrementDeveloperApiUsage } = await import("./usage-store");
    await incrementDeveloperApiUsage(provider);
  } catch {
    /* metering must never fail Mapbox / Gemini / FedEx / parcel lookups */
  }
}
