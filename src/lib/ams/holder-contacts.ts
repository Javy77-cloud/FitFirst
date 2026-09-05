import { HOLDER_CONTACT_DISCLAIMER, isHolderContactStatus } from "@/lib/domain-ams";

export type HolderContactDraft = {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  notes?: string | null;
};

export function validateHolderContact(input: HolderContactDraft):
  | {
      ok: true;
      name: string;
      email: string | null;
      phone: string | null;
      address: string | null;
      city: string | null;
      state: string | null;
      zip: string | null;
      notes: string | null;
    }
  | { ok: false; error: string } {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Holder name is required." };
  const email = input.email?.trim() || null;
  if (email && !email.includes("@")) return { ok: false, error: "Email needs an @ if present." };
  const state = input.state?.trim().toUpperCase() || null;
  if (state && state.length !== 2) return { ok: false, error: "State is the two-letter code." };
  return {
    ok: true,
    name,
    email,
    phone: input.phone?.trim() || null,
    address: input.address?.trim() || null,
    city: input.city?.trim() || null,
    state,
    zip: input.zip?.trim() || null,
    notes: input.notes?.trim() || null,
  };
}

export function formatHolderContactAddress(input: {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}): string {
  const street = input.address?.trim() ?? "";
  const cityState = [input.city?.trim(), input.state?.trim()].filter(Boolean).join(", ");
  const line = [street, cityState, input.zip?.trim()].filter(Boolean).join(", ");
  return line;
}

export function formatHolderContactLine(input: {
  name: string;
  email?: string | null;
  phone?: string | null;
}): string {
  return [input.name, input.email, input.phone].filter(Boolean).join(" · ");
}

export function holderContactIssuesCoi(): false {
  return false;
}

export function isOpenHolderContact(status: string): boolean {
  return isHolderContactStatus(status) && status === "active";
}

export { HOLDER_CONTACT_DISCLAIMER };
