import { noteDeveloperApiCall } from "@/lib/developer/usage";
import {
  loadHealthSherpaMedicareCredentials,
  type HealthSherpaEnvironment,
} from "./vault";

export const HEALTHSHERPA_MEDICARE_BASE = {
  sandbox: "https://api.medicare-staging.healthsherpa.com/v1",
  production: "https://api.medicare.healthsherpa.com/v1",
} as const;

export type HealthSherpaContactBody = {
  external_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  birth_date?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  zip?: string;
  medicare_number?: string;
  medicare_part_a_effective_date?: string;
  medicare_part_b_effective_date?: string;
  extra_help?: boolean;
  medicaid_eligible?: boolean;
  notes?: string[];
};

export type HealthSherpaContactResult = {
  contactId: string | null;
  redirectUrl: string | null;
  contact: Record<string, unknown> | null;
};

export type HealthSherpaClientError = {
  ok: false;
  status: number;
  code: string;
  message: string;
};

export type HealthSherpaClientOk = {
  ok: true;
  status: number;
  data: HealthSherpaContactResult;
};

export type HealthSherpaClientResponse = HealthSherpaClientOk | HealthSherpaClientError;

function digitsPhone(raw: string | null | undefined): string | undefined {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits.length === 10 ? digits : undefined;
}

function compactContact(input: HealthSherpaContactBody): HealthSherpaContactBody {
  const out: HealthSherpaContactBody = {
    external_id: input.external_id,
    first_name: input.first_name,
    last_name: input.last_name,
  };
  if (input.email) out.email = input.email;
  const phone = digitsPhone(input.phone);
  if (phone) out.phone = phone;
  if (input.birth_date) out.birth_date = input.birth_date;
  if (input.address_1) out.address_1 = input.address_1.slice(0, 100);
  if (input.address_2) out.address_2 = input.address_2.slice(0, 100);
  if (input.city) out.city = input.city.slice(0, 100);
  if (input.state) out.state = input.state.slice(0, 2).toUpperCase();
  if (input.zip) out.zip = input.zip.replace(/\D/g, "").slice(0, 5);
  if (input.medicare_number) out.medicare_number = input.medicare_number;
  if (input.medicare_part_a_effective_date) {
    out.medicare_part_a_effective_date = input.medicare_part_a_effective_date;
  }
  if (input.medicare_part_b_effective_date) {
    out.medicare_part_b_effective_date = input.medicare_part_b_effective_date;
  }
  if (typeof input.extra_help === "boolean") out.extra_help = input.extra_help;
  if (typeof input.medicaid_eligible === "boolean") out.medicaid_eligible = input.medicaid_eligible;
  if (input.notes?.length) out.notes = input.notes.slice(0, 50);
  return out;
}

function parseResult(json: unknown): HealthSherpaContactResult {
  const root = json && typeof json === "object" ? (json as Record<string, unknown>) : {};
  const data = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;
  const contact = data.contact && typeof data.contact === "object" ? (data.contact as Record<string, unknown>) : null;
  return {
    contactId: contact && typeof contact.id === "string" ? contact.id : null,
    redirectUrl: typeof data.redirect_url === "string" ? data.redirect_url : null,
    contact,
  };
}

function errorFrom(status: number, json: unknown, fallback: string): HealthSherpaClientError {
  const root = json && typeof json === "object" ? (json as Record<string, unknown>) : {};
  const err = root.error && typeof root.error === "object" ? (root.error as Record<string, unknown>) : null;
  return {
    ok: false,
    status,
    code: typeof err?.code === "string" ? err.code : "healthsherpa_error",
    message: typeof err?.message === "string" ? err.message : fallback,
  };
}

export function medicareBaseUrl(environment: HealthSherpaEnvironment): string {
  return HEALTHSHERPA_MEDICARE_BASE[environment];
}

export async function healthSherpaMedicareRequest(
  path: string,
  init: {
    method: "GET" | "POST" | "PATCH";
    body?: unknown;
    apiKey?: string;
    environment?: HealthSherpaEnvironment;
    fetchImpl?: typeof fetch;
  },
): Promise<HealthSherpaClientResponse> {
  const creds = init.apiKey
    ? { apiKey: init.apiKey, environment: init.environment ?? "sandbox", agentEmail: null }
    : await loadHealthSherpaMedicareCredentials();
  if (!creds?.apiKey) {
    return { ok: false, status: 0, code: "not_configured", message: "HealthSherpa Medicare API key is not configured." };
  }
  const fetchImpl = init.fetchImpl ?? fetch;
  const url = `${medicareBaseUrl(init.environment ?? creds.environment)}${path}`;
  const response = await fetchImpl(url, {
    method: init.method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-API-Key": creds.apiKey,
    },
    body: init.body == null ? undefined : JSON.stringify(init.body),
  });
  noteDeveloperApiCall("healthsherpa_medicare");
  let json: unknown = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }
  if (!response.ok) {
    return errorFrom(response.status, json, `HealthSherpa returned ${response.status}.`);
  }
  return { ok: true, status: response.status, data: parseResult(json) };
}

export async function createHealthSherpaContact(input: {
  agentEmail: string;
  contact: HealthSherpaContactBody;
  fetchImpl?: typeof fetch;
}): Promise<HealthSherpaClientResponse> {
  return healthSherpaMedicareRequest("/contacts", {
    method: "POST",
    body: { agent_email: input.agentEmail, contact: compactContact(input.contact) },
    fetchImpl: input.fetchImpl,
  });
}

export async function updateHealthSherpaContact(input: {
  contactId: string;
  agentEmail: string;
  contact: HealthSherpaContactBody;
  fetchImpl?: typeof fetch;
}): Promise<HealthSherpaClientResponse> {
  return healthSherpaMedicareRequest(`/contacts/${encodeURIComponent(input.contactId)}`, {
    method: "PATCH",
    body: { agent_email: input.agentEmail, contact: compactContact(input.contact) },
    fetchImpl: input.fetchImpl,
  });
}

export async function searchHealthSherpaContact(input: {
  agentEmail: string;
  params: {
    medicare_number?: string;
    first_name?: string;
    last_name?: string;
    date_of_birth?: string;
    email?: string;
    phone?: string;
  };
  fetchImpl?: typeof fetch;
}): Promise<HealthSherpaClientResponse> {
  return healthSherpaMedicareRequest("/contacts/search", {
    method: "POST",
    body: { agent_email: input.agentEmail, params: input.params },
    fetchImpl: input.fetchImpl,
  });
}

export async function syncHealthSherpaContact(input: {
  agentEmail: string;
  hsContactId?: string | null;
  contact: HealthSherpaContactBody;
  fetchImpl?: typeof fetch;
}): Promise<HealthSherpaClientResponse> {
  if (input.hsContactId) {
    return updateHealthSherpaContact({
      contactId: input.hsContactId,
      agentEmail: input.agentEmail,
      contact: input.contact,
      fetchImpl: input.fetchImpl,
    });
  }
  const created = await createHealthSherpaContact(input);
  if (created.ok || created.status !== 422) return created;
  const searched = await searchHealthSherpaContact({
    agentEmail: input.agentEmail,
    params: {
      medicare_number: input.contact.medicare_number,
      first_name: input.contact.first_name,
      last_name: input.contact.last_name,
      date_of_birth: input.contact.birth_date,
      email: input.contact.email,
      phone: digitsPhone(input.contact.phone),
    },
    fetchImpl: input.fetchImpl,
  });
  if (!searched.ok || !searched.data.contactId) return created;
  return updateHealthSherpaContact({
    contactId: searched.data.contactId,
    agentEmail: input.agentEmail,
    contact: input.contact,
    fetchImpl: input.fetchImpl,
  });
}
