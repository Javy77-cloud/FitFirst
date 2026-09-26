import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { buildServicingChecklist } from "@/lib/ams/checklist";
import { DESK_AS_OF } from "@/lib/home/as-of";
import { AttachDocTypeConfirmCopy } from "@/components/policy/attach-doc-type-confirm";
import { attachDocTypeConfirmLabel } from "./attach-doc-type-confirm";
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

function hrefForChecklistDocuments(html: string, key: string): string | null {
  const anchor = html.match(
    new RegExp(`<a\\b(?=[^>]*data-ff-checklist-documents="${key}")[^>]*>`),
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
    expect(optionalServicingPacketDocumentsHref("pol-1", "id_card")).toBe(
      "/policies/pol-1?tab=documents&docType=policy_id",
    );
    expect(policyDocumentsTabHref("pol-1")).toBe("/policies/pol-1?tab=documents");
    expect(presetPolicyAttachDocType("renewal_docs")).toBe("renewal_docs");
    expect(presetPolicyAttachDocType("inspection")).toBe("inspection");
    expect(presetPolicyAttachDocType("endorsement")).toBe("endorsement");
    expect(presetPolicyAttachDocType("roof_docs")).toBe("roof_docs");
    expect(presetPolicyAttachDocType("loss_runs")).toBe("loss_runs");

    const html = renderToStaticMarkup(
      createElement(ServicingChecklistCard, {
        policyId: "pol-1",
        checklist: { items: [], readyCount: 0, missingCount: 0, lobFamily: "classic" },
        packetOnFile: { aor: false, id_card: false },
      }),
    );
    expect(hrefForChecklistDocuments(html, "aor")).toBe("/policies/pol-1?tab=documents&amp;docType=aor");
    expect(hrefForChecklistDocuments(html, "id_card")).toBe(
      "/policies/pol-1?tab=documents&amp;docType=policy_id",
    );
  });

  it("opens Documents with the row attach type and hides Mark complete on file-backed rows", () => {
    const checklist = buildServicingChecklist({
      files: [],
      expirationDate: "2026-10-01",
      nextTask: null,
      lineOfBusiness: "HO3",
      checks: [{ key: "roof_docs", status: "incomplete" }],
      asOf: DESK_AS_OF,
    });
    const html = renderToStaticMarkup(
      createElement(ServicingChecklistCard, {
        policyId: "pol-1",
        checklist,
        packetOnFile: { aor: false, id_card: false },
      }),
    );
    const expected: Record<string, string> = {
      dec: "/policies/pol-1?tab=documents&amp;docType=policy_dec",
      mortgagee: "/policies/pol-1?tab=documents&amp;docType=endorsement",
      inspection: "/policies/pol-1?tab=documents&amp;docType=inspection",
      renewal_docs: "/policies/pol-1?tab=documents&amp;docType=renewal_docs",
      roof_docs: "/policies/pol-1?tab=documents&amp;docType=roof_docs",
      aor: "/policies/pol-1?tab=documents&amp;docType=aor",
      id_card: "/policies/pol-1?tab=documents&amp;docType=policy_id",
    };
    for (const [key, href] of Object.entries(expected)) {
      expect(hrefForChecklistDocuments(html, key), key).toBe(href);
      expect(html.includes(`data-ff-checklist-mark="${key}"`), key).toBe(false);
    }
    expect(html).toContain('data-ff-checklist-item="roof_docs"');
    expect(html).toContain('data-ff-checklist-status="Missing"');
    expect(html).not.toMatch(/data-ff-checklist-mark=/);
    expect(html).not.toContain("Mark Complete");
    expect(html).not.toContain(">Reopen<");

    const auto = renderToStaticMarkup(
      createElement(ServicingChecklistCard, {
        policyId: "pol-1",
        checklist: buildServicingChecklist({
          files: [{ docType: "policy_id" }],
          expirationDate: "2027-09-01",
          nextTask: null,
          lineOfBusiness: "PA",
          asOf: DESK_AS_OF,
        }),
        packetOnFile: { aor: true },
      }),
    );
    expect(hrefForChecklistDocuments(auto, "id_cards")).toBe(
      "/policies/pol-1?tab=documents&amp;docType=policy_id",
    );
    expect(hrefForChecklistDocuments(auto, "aor")).toBe(
      "/policies/pol-1?tab=documents&amp;docType=aor",
    );
    expect(auto.includes('data-ff-checklist-mark="id_cards"')).toBe(false);
    expect(auto).toContain('data-ff-checklist-status="On file"');
    expect(auto).toContain('data-ff-checklist-status="Complete"');
    expect(auto).toContain('data-ff-checklist-status="Missing"');

    const homeFiled = renderToStaticMarkup(
      createElement(ServicingChecklistCard, {
        policyId: "pol-george",
        checklist: buildServicingChecklist({
          files: [{ docType: "roof_docs" }],
          expirationDate: "2026-10-01",
          nextTask: null,
          lineOfBusiness: "HO3",
          checks: [{ key: "roof_docs", status: "incomplete" }],
          asOf: DESK_AS_OF,
        }),
      }),
    );
    expect(hrefForChecklistDocuments(homeFiled, "roof_docs")).toBe(
      "/policies/pol-george?tab=documents&amp;docType=roof_docs",
    );
    expect(homeFiled).toContain('data-ff-checklist-status="On file"');
    expect(homeFiled).not.toMatch(/data-ff-checklist-mark=/);

    const commercial = renderToStaticMarkup(
      createElement(ServicingChecklistCard, {
        policyId: "pol-1",
        checklist: buildServicingChecklist({
          files: [],
          expirationDate: null,
          nextTask: null,
          lineOfBusiness: "GL",
          asOf: DESK_AS_OF,
        }),
      }),
    );
    expect(hrefForChecklistDocuments(commercial, "loss_runs")).toBe(
      "/policies/pol-1?tab=documents&amp;docType=loss_runs",
    );
    expect(commercial).not.toContain('data-ff-checklist-mark="loss_runs"');

    const life = renderToStaticMarkup(
      createElement(ServicingChecklistCard, {
        policyId: "pol-1",
        checklist: buildServicingChecklist({
          files: [],
          expirationDate: null,
          nextTask: null,
          lineOfBusiness: "LIFE",
          checks: [{ key: "beneficiary", status: "incomplete" }],
          asOf: DESK_AS_OF,
        }),
      }),
    );
    expect(life).toContain('data-ff-checklist-mark="beneficiary"');
    expect(life).toContain('data-ff-checklist-mark="medical_exam"');
    expect(life).toContain('data-ff-checklist-mark="underwriting"');
    expect(life).toContain("Mark Complete");
    expect(life).not.toContain('data-ff-checklist-mark="renewal_docs"');
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

    const roof = renderToStaticMarkup(
      createElement(PolicyDocumentsAttach, { policyId: "pol-1", presetDocType: "roof_docs" }),
    );
    expect(selectedOptionValue(roof, "docType")).toBe("roof_docs");
    expect(roof).toContain("Roof docs");

    const loss = renderToStaticMarkup(
      createElement(PolicyDocumentsAttach, { policyId: "pol-1", presetDocType: "loss_runs" }),
    );
    expect(selectedOptionValue(loss, "docType")).toBe("loss_runs");
    expect(loss).toContain("Loss runs");
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
    expect(attach).toMatch(/setConfirmOpen\(true\)/);
    expect(attach).toMatch(/AttachDocTypeConfirmDialog/);
    expect(attach).toMatch(/commitAttach/);

    const fileAttach = source("src/components/policy/policy-file-attach.tsx");
    expect(fileAttach).toMatch(/AttachDocTypeConfirmDialog/);
    expect(fileAttach).toMatch(/setConfirmTypes\(/);
    expect(fileAttach).toMatch(/commitAttach/);
  });

  it("states the attach type in ALL CAPS, larger and bolder than the sentence around it", () => {
    expect(attachDocTypeConfirmLabel("aor")).toBe("AOR PACKET");
    expect(attachDocTypeConfirmLabel("policy_dec")).toBe("ISSUED DECLARATION PAGE");
    expect(attachDocTypeConfirmLabel("policy_id")).toBe("ID CARD");
    expect(attachDocTypeConfirmLabel("inspection")).toBe("INSPECTION");
    expect(attachDocTypeConfirmLabel("endorsement")).toBe("ENDORSEMENT");
    expect(attachDocTypeConfirmLabel("renewal_docs")).toBe("RENEWAL DOCS");
    expect(attachDocTypeConfirmLabel("coi")).toBe("COI");
    expect(attachDocTypeConfirmLabel("roof_docs")).toBe("ROOF DOCS");
    expect(attachDocTypeConfirmLabel("loss_runs")).toBe("LOSS RUNS");

    const html = renderToStaticMarkup(
      createElement(AttachDocTypeConfirmCopy, { docTypes: ["aor", "inspection"] }),
    );
    const type = html.match(/<p[^>]*data-ff-attach-confirm-type=""[^>]*>/)?.[0] ?? "";
    expect(type).toMatch(/text-2xl/);
    expect(type).toMatch(/font-extrabold/);
    expect(html).toContain("AOR PACKET");
    expect(html).toContain("INSPECTION");
    expect(html).toContain("text-sm");
    expect(html).toContain("Go back if you need to change Type first.");
    expect(html).not.toMatch(/data-ff-attach-confirm-type="aor"[^>]*>[^<]*[a-z]/);
  });
});
