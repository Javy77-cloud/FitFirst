import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_POLICY_ATTACH_DOC_TYPE,
  optionalServicingPacketDocumentsHref,
  policyDocumentsTabHref,
  presetPolicyAttachDocType,
} from "./policy-documents-href";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined, replace: () => undefined, push: () => undefined }),
}));

import { ServicingChecklistCard } from "@/components/ams/servicing-checklist";
import { PolicyDocumentsAttach } from "@/components/policy/policy-documents-attach";
import { PolicyFileAttach } from "@/components/policy/policy-file-attach";

function source(file: string) {
  return readFileSync(file, "utf8");
}

function hrefForOptionalPacket(html: string, key: string): string | null {
  const anchor = html.match(
    new RegExp(`<a\\b(?=[^>]*data-ff-optional-packet-docs="${key}")[^>]*>`),
  );
  return anchor?.[0].match(/\bhref="([^"]+)"/)?.[1] ?? null;
}

function selectedOptionValue(html: string, selectName: string): string | null {
  const select = html.match(new RegExp(`<select[^>]*name="${selectName}"[\\s\\S]*?</select>`));
  if (!select) return null;
  const selected = select[0].match(
    /<option[^>]*\bselected\b[^>]*\bvalue="([^"]+)"|<option[^>]*\bvalue="([^"]+)"[^>]*\bselected\b/,
  );
  return selected?.[1] ?? selected?.[2] ?? null;
}

describe("policy documents attach preset", () => {
  it("accepts AOR packet and ignores types that are not on the attach list", () => {
    expect(presetPolicyAttachDocType("aor")).toBe("aor");
    expect(presetPolicyAttachDocType("AOR")).toBe("aor");
    expect(presetPolicyAttachDocType(" policy_id ")).toBe("policy_id");
    expect(presetPolicyAttachDocType(null)).toBe(DEFAULT_POLICY_ATTACH_DOC_TYPE);
    expect(presetPolicyAttachDocType("")).toBe("policy_dec");
    expect(presetPolicyAttachDocType("dec")).toBe("policy_dec");
    expect(presetPolicyAttachDocType("current_policy")).toBe("policy_dec");
  });

  it("deep-links optional AOR collect to Documents with docType=aor", () => {
    expect(policyDocumentsTabHref("pol-1", "aor")).toBe("/policies/pol-1?tab=documents&docType=aor");
    expect(optionalServicingPacketDocumentsHref("pol-1", "aor")).toBe(
      "/policies/pol-1?tab=documents&docType=aor",
    );
    expect(optionalServicingPacketDocumentsHref("pol-1", "id_card")).toBe("/policies/pol-1?tab=documents");
    expect(policyDocumentsTabHref("pol-1")).toBe("/policies/pol-1?tab=documents");

    const html = renderToStaticMarkup(
      createElement(ServicingChecklistCard, {
        policyId: "pol-1",
        checklist: { items: [], readyCount: 0, missingCount: 0, lobFamily: "classic" },
        packetOnFile: { aor: false, id_card: false },
      }),
    );
    expect(hrefForOptionalPacket(html, "aor")).toBe("/policies/pol-1?tab=documents&amp;docType=aor");
    expect(hrefForOptionalPacket(html, "id_card")).toBe("/policies/pol-1?tab=documents");
  });

  it("preselects AOR packet on Policy Documents attach and keeps the issued DEC default", () => {
    const aor = renderToStaticMarkup(
      createElement(PolicyDocumentsAttach, { policyId: "pol-1", presetDocType: "aor" }),
    );
    expect(selectedOptionValue(aor, "docType")).toBe("aor");
    expect(aor).toContain("AOR packet");

    const dec = renderToStaticMarkup(createElement(PolicyDocumentsAttach, { policyId: "pol-1" }));
    expect(selectedOptionValue(dec, "docType")).toBe("policy_dec");
    expect(dec).toContain("Issued declaration page");
  });

  it("preselects Category on the policy file attach when a preset is passed", () => {
    const html = renderToStaticMarkup(
      createElement(PolicyFileAttach, {
        policyId: "pol-1",
        files: [],
        presetDocType: "aor",
      }),
    );
    expect(selectedOptionValue(html, "category")).toBe("aor");
  });

  it("wires the checklist Documents link and the policy page query into the attach form", () => {
    const checklist = source("src/components/ams/servicing-checklist.tsx");
    expect(checklist).toMatch(/optionalServicingPacketDocumentsHref\(policyId, key\)/);
    expect(checklist).not.toMatch(/href=\{`\/policies\/\$\{policyId\}\?tab=documents`\}/);

    const page = source("src/app/policies/[id]/page.tsx");
    expect(page).toMatch(/query\.docType/);
    expect(page).toMatch(/presetDocType=\{presetDocType\}/);

    const tab = source("src/components/policy/tabs/documents-tab.tsx");
    expect(tab).toMatch(/presetDocType=\{presetDocType\}/);

    const attach = source("src/components/policy/policy-documents-attach.tsx");
    expect(attach).toMatch(/presetPolicyAttachDocType\(presetDocType\)/);
    expect(attach).toMatch(/name="docType"/);
  });
});
