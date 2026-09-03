import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { policyStatusCounts } from "@/lib/account-360";

type Wave1Contact = {
  zoho_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  mobile: string | null;
};
type Wave1Business = { zoho_id: string; legal_name: string; primary_contact_zoho_id: string };
type Wave1Policy = {
  source_id: string;
  zoho_id: string | null;
  contact_zoho_id: string;
  business_zoho_id: string | null;
  status: string;
  form_type: string;
  carrier_name: string;
  policy_number: string;
};

function load<T>(name: string): T {
  return JSON.parse(readFileSync(path.join(process.cwd(), "prisma", "seed", name), "utf8")) as T;
}

describe("wave-1 fixtures", () => {
  const contacts = load<Wave1Contact[]>("wave1-contacts.json");
  const businesses = load<Wave1Business[]>("wave1-businesses.json");
  const policies = load<Wave1Policy[]>("wave1-policies.json");

  it("has 19 contacts, 2 businesses, 37 policies and no Ana or Javier WC", () => {
    expect(contacts).toHaveLength(19);
    expect(businesses).toHaveLength(2);
    expect(policies).toHaveLength(37);
    expect(contacts.some((c) => c.first_name === "Ana" && c.last_name === "Dib")).toBe(false);
    expect(businesses.some((b) => /javier garcia/i.test(b.legal_name))).toBe(false);
    expect(new Set(contacts.map((c) => c.zoho_id)).size).toBe(19);
    expect(new Set(policies.map((p) => p.source_id)).size).toBe(37);
    expect(policies.every((p) => p.zoho_id && p.zoho_id.startsWith("6742853"))).toBe(true);
    expect(new Set(policies.map((p) => p.zoho_id)).size).toBe(37);
    expect(contacts.find((c) => c.last_name === "Cromartie")?.email).toBe("mjcromartie@gmail.com");
    expect(contacts.find((c) => c.last_name === "Palacios")?.email).toBeNull();
    expect(contacts.find((c) => c.last_name === "Palacios")?.mobile).toBe("661-219-3622");
  });

  it("keeps Mario's three book policies", () => {
    const mario = contacts.find((c) => c.first_name === "Mario" && c.last_name === "Cromartie");
    expect(mario?.zoho_id).toBe("6742853000009030030");
    const rows = policies.filter((p) => p.contact_zoho_id === mario?.zoho_id);
    expect(rows).toHaveLength(3);
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: "pending",
          form_type: "DP3",
          carrier_name: "People's Trust",
          policy_number: "PFL677036-00",
        }),
        expect.objectContaining({
          status: "active",
          form_type: "DP1",
          carrier_name: "Manatee",
          policy_number: "MFLD3071678",
        }),
        expect.objectContaining({
          status: "active",
          form_type: "HO3",
          carrier_name: "People's Trust",
          policy_number: "PFL493106-00",
        }),
      ]),
    );
    expect(policyStatusCounts(rows)).toMatchObject({ lifetime: 3, active: 2, pending: 1 });
  });

  it("puts VP Painting WC/GL on the business and health on Virginia only", () => {
    const virginia = contacts.find((c) => c.first_name === "Virginia");
    const vp = businesses.find((b) => b.legal_name.startsWith("VP Painting"));
    expect(vp?.primary_contact_zoho_id).toBe(virginia?.zoho_id);
    const rows = policies.filter((p) => p.contact_zoho_id === virginia?.zoho_id);
    expect(rows.filter((p) => p.business_zoho_id === vp?.zoho_id).map((p) => p.form_type)).toEqual(
      expect.arrayContaining(["WC", "GL"]),
    );
    expect(rows.find((p) => p.form_type === "Supplemental Health")?.business_zoho_id).toBeNull();
  });

  it("gives Douglas five policies for Account 360 multi-policy", () => {
    const douglas = contacts.find((c) => c.last_name === "Mcalister");
    const rows = policies.filter((p) => p.contact_zoho_id === douglas?.zoho_id);
    expect(rows).toHaveLength(5);
    expect(policyStatusCounts(rows).lifetime).toBe(5);
    expect(policyStatusCounts(rows).active).toBe(5);
  });
});
